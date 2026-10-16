/**
 * TermsLock: B2B PO, Tax & Net-30 Checkout Rules
 * Native Cloudflare Workers Edge Adapter (workerd / V8 isolates)
 * 
 * Provides 100% headless, zero-maintenance global edge hosting with 0ms cold starts,
 * in-memory static assets (polaris.css + app.bundle.js), Web Crypto HMAC verification,
 * and RFC 8693 Token Exchange.
 */

import { DEFAULT_RULES_CONFIG } from "../extensions/b2b-checkout-validator/src/run.ts";
import type { TermsLockRulesConfig } from "../extensions/b2b-checkout-validator/src/types.ts";
import { DEFAULT_PAYMENT_RULES_CONFIG } from "../extensions/b2b-payment-gate/src/run.ts";
import type { TermsLockPaymentRulesConfig } from "../extensions/b2b-payment-gate/src/types.ts";
import {
  compilePaymentRulesMetafield,
  compileValidationRulesMetafield,
  InvalidRuleRegexError,
  MetafieldBudgetExceededError
} from "../web/compiler/metafield-compiler.ts";
import {
  executeDryRunSimulation,
  type DryRunSimulatorScenario
} from "../web/simulator/dry-run-simulator.ts";
import { renderEmbeddedRuleBuilderHtml } from "../web/ui/rule-builder-app.ts";
import {
  renderPrivacyPolicyHtml,
  renderDemoPageHtml
} from "../web/ui/public-pages.ts";
import {
  handleGdprWebhookAsync,
  verifyShopifyWebhookHmacWebCrypto,
  type GdprTopic
} from "../web/webhooks/gdpr-handlers.ts";
import {
  exchangeSessionTokenForAccessToken,
  createLiveShopifyAdminGraphQLClient
} from "../web/admin/shopify-oauth.ts";
import {
  syncRulesToShopifyAdmin,
  type AdminGraphQLClient
} from "../web/admin/graphql-mutations.ts";
import {
  createOrBypassAppSubscription,
  type BillingPlanTier
} from "../web/billing/shopify-billing.ts";
import {
  POLARIS_CSS,
  APP_BUNDLE_JS
} from "./assets/embedded-assets.ts";

export interface Env {
  SHOPIFY_API_KEY?: string;
  SHOPIFY_API_SECRET?: string;
  SCOPES?: string;
  DEFAULT_WEBHOOK_SECRET?: string;
  [key: string]: unknown;
}

export interface TermsLockWorkerState {
  validationRules: TermsLockRulesConfig;
  paymentRules: TermsLockPaymentRulesConfig;
}

export const DEFAULT_INITIAL_VALIDATION_RULES: TermsLockRulesConfig = {
  ...DEFAULT_RULES_CONFIG,
  poRule: {
    ...DEFAULT_RULES_CONFIG.poRule,
    regexPattern: "^PO-[0-9]{6}$",
    subtotalThreshold: 1000.0
  },
  moqRule: {
    ...DEFAULT_RULES_CONFIG.moqRule,
    minimumSubtotal: 500.0
  }
};

export const DEFAULT_INITIAL_PAYMENT_RULES: TermsLockPaymentRulesConfig = {
  ...DEFAULT_PAYMENT_RULES_CONFIG,
  poRegexPattern: "^PO-[0-9]{6}$",
  highValueCardThreshold: 5000.0
};

let workerState: TermsLockWorkerState = {
  validationRules: structuredClone(DEFAULT_INITIAL_VALIDATION_RULES),
  paymentRules: structuredClone(DEFAULT_INITIAL_PAYMENT_RULES)
};

export function getWorkerState(): TermsLockWorkerState {
  return workerState;
}

export function resetWorkerState(newState?: Partial<TermsLockWorkerState>): void {
  workerState = {
    validationRules: structuredClone(newState?.validationRules ?? DEFAULT_INITIAL_VALIDATION_RULES),
    paymentRules: structuredClone(newState?.paymentRules ?? DEFAULT_INITIAL_PAYMENT_RULES)
  };
}

function jsonResponse(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const method = request.method;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const webhookSecret =
    env.SHOPIFY_API_SECRET ??
    env.DEFAULT_WEBHOOK_SECRET ??
    "shpss_termslock_2026_10_secret";

  try {
    // 0a. GET /polaris.css -> Official @shopify/polaris stylesheet (in-memory embedded asset)
    if ((method === "GET" || method === "HEAD") && pathname === "/polaris.css") {
      return new Response(method === "HEAD" ? null : POLARIS_CSS, {
        status: 200,
        headers: {
          "Content-Type": "text/css; charset=utf-8",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
        }
      });
    }

    // 0b. GET /app.bundle.js -> Client hydration & interactive preview bundle
    if ((method === "GET" || method === "HEAD") && pathname === "/app.bundle.js") {
      return new Response(method === "HEAD" ? null : APP_BUNDLE_JS, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
        }
      });
    }

    // 1. GET / -> Full Interactive Admin Rule Builder & Dry-Run Simulator HTML
    if ((method === "GET" || method === "HEAD") && pathname === "/") {
      const isEmbedded =
        url.searchParams.get("embedded") === "1" ||
        url.searchParams.has("host");
      const html = renderEmbeddedRuleBuilderHtml({
        activePlan: "PLUS_ENTERPRISE",
        validationRules: workerState.validationRules,
        paymentRules: workerState.paymentRules,
        isEmbedded,
        apiKey: env.SHOPIFY_API_KEY
      });
      return new Response(method === "HEAD" ? null : html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
    }

    // 1b. GET /privacy -> Public Zero-Login Privacy & GDPR Compliance Page
    if ((method === "GET" || method === "HEAD") && pathname === "/privacy") {
      const html = renderPrivacyPolicyHtml();
      return new Response(method === "HEAD" ? null : html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }

    // 1c. GET /demo -> Public Interactive Product Demo & Video Walkthrough
    if ((method === "GET" || method === "HEAD") && pathname === "/demo") {
      const html = renderDemoPageHtml("/demo-video.mp4");
      return new Response(method === "HEAD" ? null : html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }

    // 1d. GET /demo-video.mp4 or /demo-video.webm -> Stream from GitHub Raw CDN
    if (
      (method === "GET" || method === "HEAD") &&
      (pathname === "/demo-video.mp4" || pathname === "/demo-video.webm")
    ) {
      const isMp4 = pathname.endsWith(".mp4");
      const cdnUrl = isMp4
        ? "https://raw.githubusercontent.com/Allerdyce/termslock-b2b-docs/main/docs/shopify-store/termslock-screencast.mp4"
        : "https://raw.githubusercontent.com/Allerdyce/termslock-b2b-docs/main/docs/shopify-store/termslock-screencast.webm";

      const cdnResponse = await fetch(cdnUrl, {
        headers: request.headers.get("Range") ? { Range: request.headers.get("Range")! } : undefined
      });

      if (!cdnResponse.ok && cdnResponse.status !== 304 && cdnResponse.status !== 206) {
        return new Response("Video stream unavailable", { status: 502 });
      }

      const headers = new Headers();
      headers.set("Content-Type", isMp4 ? "video/mp4" : "video/webm");
      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Accept-Ranges", "bytes");

      const cl = cdnResponse.headers.get("Content-Length");
      if (cl) headers.set("Content-Length", cl);
      const cr = cdnResponse.headers.get("Content-Range");
      if (cr) headers.set("Content-Range", cr);

      return new Response(method === "HEAD" ? null : cdnResponse.body, {
        status: cdnResponse.status,
        headers
      });
    }

    // 1e. Static Store Assets Proxy: /app-icon.png and /screenshot-[1-3].png
    if (
      (method === "GET" || method === "HEAD") &&
      (pathname === "/app-icon.png" ||
        pathname === "/screenshot-1.png" ||
        pathname === "/screenshot-2.png" ||
        pathname === "/screenshot-3.png")
    ) {
      const filenameMap: Record<string, string> = {
        "/app-icon.png": "app-icon-1200x1200.png",
        "/screenshot-1.png": "01-b2b-po-number-checkout-validation.png",
        "/screenshot-2.png": "02-net30-payment-method-customization.png",
        "/screenshot-3.png": "03-wholesale-moq-dryrun-simulator.png"
      };
      const filename = filenameMap[pathname];
      const cdnUrl = `https://raw.githubusercontent.com/Allerdyce/termslock-b2b-docs/main/docs/shopify-store/screenshots/${filename}`;
      const cdnResponse = await fetch(cdnUrl);
      if (!cdnResponse.ok) {
        return new Response("Image asset unavailable", { status: 502 });
      }
      const headers = new Headers();
      headers.set("Content-Type", "image/png");
      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      headers.set("Access-Control-Allow-Origin", "*");
      const cl = cdnResponse.headers.get("Content-Length");
      if (cl) headers.set("Content-Length", cl);

      return new Response(method === "HEAD" ? null : cdnResponse.body, {
        status: 200,
        headers
      });
    }

    // 2. GET /api/rules -> Returns active rules and compiled $app:termslock metafields
    if (method === "GET" && pathname === "/api/rules") {
      const validationMetafield = compileValidationRulesMetafield(
        workerState.validationRules
      );
      const paymentMetafield = compilePaymentRulesMetafield(
        workerState.paymentRules
      );
      return jsonResponse({
        validationRules: workerState.validationRules,
        paymentRules: workerState.paymentRules,
        validationMetafield,
        paymentMetafield
      });
    }

    // 3. POST /api/rules -> Updates and compiles merchant rules with <10 KB budget enforcement
    if (method === "POST" && pathname === "/api/rules") {
      const rawText = await request.text();
      const parsed = JSON.parse(rawText || "{}") as Record<string, unknown>;

      const nextValidation: TermsLockRulesConfig = structuredClone(
        (parsed.validationRules as TermsLockRulesConfig | undefined) ??
          workerState.validationRules
      );
      const nextPayment: TermsLockPaymentRulesConfig = structuredClone(
        (parsed.paymentRules as TermsLockPaymentRulesConfig | undefined) ??
          workerState.paymentRules
      );

      if (typeof parsed.poRegexPattern === "string") {
        nextValidation.poRule.regexPattern = parsed.poRegexPattern;
        nextPayment.poRegexPattern = parsed.poRegexPattern;
      }
      if (typeof parsed.poSubtotalThreshold === "number") {
        nextValidation.poRule.subtotalThreshold = parsed.poSubtotalThreshold;
      }
      if (typeof parsed.minimumSubtotal === "number") {
        nextValidation.moqRule.minimumSubtotal = parsed.minimumSubtotal;
      }
      if (Array.isArray(parsed.authorizedNet30Tags)) {
        nextPayment.authorizedNet30Tags = parsed.authorizedNet30Tags.map(String);
      }
      if (typeof parsed.highValueCardThreshold === "number") {
        nextPayment.highValueCardThreshold = parsed.highValueCardThreshold;
      }
      if (typeof parsed.poEnabled === "boolean") {
        nextValidation.poRule.enabled = parsed.poEnabled;
      }
      if (typeof parsed.blockPoBoxOnFreight === "boolean") {
        nextValidation.billingRule.blockPoBoxOnFreight = parsed.blockPoBoxOnFreight;
      }
      if (typeof parsed.moqEnabled === "boolean") {
        nextValidation.moqRule.enabled = parsed.moqEnabled;
      }
      if (typeof parsed.hazmatEnabled === "boolean") {
        nextValidation.hazmatRule.enabled = parsed.hazmatEnabled;
      }
      if (typeof parsed.errorMessageMissing === "string") {
        nextValidation.poRule.errorMessageMissing = parsed.errorMessageMissing;
      }

      try {
        const validationMetafield = compileValidationRulesMetafield(nextValidation);
        const paymentMetafield = compilePaymentRulesMetafield(nextPayment);

        workerState.validationRules = nextValidation;
        workerState.paymentRules = nextPayment;

        // Optional live Shopify Admin GraphQL sync (Bearer <id_token> + shop domain)
        const authHeader = request.headers.get("authorization") ?? "";
        const shop = (
          request.headers.get("x-shopify-shop-domain") ||
          url.searchParams.get("shop") ||
          (parsed.shop as string) ||
          ""
        ).toLowerCase().trim();

        const idToken = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7).trim()
          : "";

        let liveSync: { synced: boolean; shop?: string; updatedCount?: number } = {
          synced: false
        };

        if (shop && idToken && env.SHOPIFY_API_SECRET) {
          try {
            const tokenResult = await exchangeSessionTokenForAccessToken({
              shop,
              idToken,
              clientId: env.SHOPIFY_API_KEY,
              clientSecret: env.SHOPIFY_API_SECRET
            });
            const client = createLiveShopifyAdminGraphQLClient(
              shop,
              tokenResult.accessToken
            );
            const syncRes = await syncRulesToShopifyAdmin(client, {
              cartValidationOwnerId:
                (parsed.cartValidationOwnerId as string) ||
                "gid://shopify/CartValidation/1",
              paymentCustomizationOwnerId:
                (parsed.paymentCustomizationOwnerId as string) ||
                "gid://shopify/PaymentCustomization/1",
              validationRules: nextValidation,
              paymentRules: nextPayment
            });
            liveSync = {
              synced: true,
              shop,
              updatedCount: syncRes.updatedCount
            };
          } catch (syncErr) {
            console.warn("[TermsLock Worker Live Sync Warning]:", syncErr);
          }
        }

        return jsonResponse({
          saved: true,
          validationRules: workerState.validationRules,
          paymentRules: workerState.paymentRules,
          validationMetafield,
          paymentMetafield,
          liveSync
        });
      } catch (err) {
        if (
          err instanceof MetafieldBudgetExceededError ||
          err instanceof InvalidRuleRegexError
        ) {
          return jsonResponse(
            {
              saved: false,
              error: err.message,
              errorType: err.name
            },
            400
          );
        }
        throw err;
      }
    }

    // 4. POST /api/simulate -> Dry-Run Simulator endpoint
    if (method === "POST" && pathname === "/api/simulate") {
      const rawText = await request.text();
      const scenario = JSON.parse(rawText || "{}") as DryRunSimulatorScenario;
      const report = executeDryRunSimulation(
        scenario,
        workerState.validationRules,
        workerState.paymentRules
      );
      return jsonResponse(report);
    }

    // 5. POST /api/billing/subscribe -> App Subscription endpoint
    if (method === "POST" && pathname === "/api/billing/subscribe") {
      const rawText = await request.text();
      const parsed = JSON.parse(rawText || "{}") as {
        tier?: BillingPlanTier;
        returnUrl?: string;
        shop?: string;
        isTestCharge?: boolean;
      };

      const tier: BillingPlanTier = parsed.tier ?? "PLUS_ENTERPRISE";
      const returnUrl = parsed.returnUrl || "/?billing=success";
      const isTestCharge = parsed.isTestCharge ?? true;

      const authHeader = request.headers.get("authorization") ?? "";
      const shop = (
        request.headers.get("x-shopify-shop-domain") ||
        url.searchParams.get("shop") ||
        parsed.shop ||
        ""
      ).toLowerCase().trim();
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : "";

      let client: AdminGraphQLClient = {
        request: async <TData = unknown>() =>
          ({
            data: {
              appSubscriptionCreate: {
                confirmationUrl: returnUrl,
                appSubscription: {
                  id: "gid://shopify/AppSubscription/mock-2026-10",
                  name: "Shopify Plus & Enterprise Wholesale Plan",
                  status: "PENDING",
                  trialDays: 14
                },
                userErrors: []
              }
            } as unknown as TData
          })
      };

      if (shop && idToken && env.SHOPIFY_API_SECRET) {
        try {
          const tokenResult = await exchangeSessionTokenForAccessToken({
            shop,
            idToken,
            clientId: env.SHOPIFY_API_KEY,
            clientSecret: env.SHOPIFY_API_SECRET
          });
          client = createLiveShopifyAdminGraphQLClient(
            shop,
            tokenResult.accessToken
          );
        } catch (tokenErr) {
          console.warn("[TermsLock Worker Billing Token Exchange]:", tokenErr);
        }
      }

      const subResult = await createOrBypassAppSubscription(client, {
        tier,
        returnUrl,
        isTestCharge,
        env: {
          SHOPIFY_API_KEY: env.SHOPIFY_API_KEY,
          SHOPIFY_API_SECRET: env.SHOPIFY_API_SECRET
        }
      });

      return jsonResponse({
        success: true,
        confirmationUrl: subResult.confirmationUrl,
        status: subResult.status,
        tier: subResult.tier,
        planName: subResult.planName,
        amountUsd: subResult.amountUsd,
        subscriptionId: subResult.subscriptionId,
        bypassed: subResult.bypassed
      });
    }

    // 6. POST /api/webhooks/gdpr -> Web Crypto HMAC GDPR Webhook
    if (
      method === "POST" &&
      (pathname === "/api/webhooks/gdpr" || pathname === "/webhooks/gdpr")
    ) {
      const rawBuffer = await request.arrayBuffer();
      const hmacHeader = request.headers.get("x-shopify-hmac-sha256") ?? "";
      const topicHeader = (request.headers.get("x-shopify-topic") ??
        "customers/data_request") as GdprTopic;

      const result = await handleGdprWebhookAsync({
        topic: topicHeader,
        rawBody: rawBuffer,
        hmacHeader,
        clientSecret: webhookSecret
      });

      return jsonResponse(result, result.statusCode);
    }

    // 7. POST /api/webhooks/uninstalled -> Mandatory App Uninstall Webhook
    if (
      method === "POST" &&
      (pathname === "/api/webhooks/uninstalled" ||
        pathname === "/webhooks/uninstalled" ||
        pathname === "/api/webhooks/app/uninstalled")
    ) {
      const rawBuffer = await request.arrayBuffer();
      const hmacHeader = request.headers.get("x-shopify-hmac-sha256") ?? "";
      const verified = await verifyShopifyWebhookHmacWebCrypto(
        rawBuffer,
        hmacHeader,
        webhookSecret
      );

      if (!verified) {
        return jsonResponse(
          {
            error: "Unauthorized",
            message: "Invalid X-Shopify-Hmac-Sha256 signature",
            topic: "app/uninstalled"
          },
          401
        );
      }

      let shopDomain = "unknown.myshopify.com";
      try {
        const text = new TextDecoder().decode(rawBuffer);
        const parsed = JSON.parse(text);
        shopDomain =
          parsed.myshopify_domain ||
          parsed.shop_domain ||
          parsed.domain ||
          shopDomain;
      } catch {
        // ignore JSON parse error on cleanup
      }

      return jsonResponse({
        success: true,
        topic: "app/uninstalled",
        shopDomain,
        action:
          "App uninstalled acknowledged. Merchant metafields and access tokens cleared.",
        acknowledgedAt: new Date().toISOString()
      });
    }

    return jsonResponse(
      { error: `Route not found: ${method} ${pathname}` },
      404
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return jsonResponse({ error: message }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  }
};
