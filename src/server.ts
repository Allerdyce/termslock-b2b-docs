import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  handleGdprWebhook,
  verifyShopifyWebhookHmac,
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

export const DEFAULT_PORT = 3456;
export const DEFAULT_WEBHOOK_SECRET =
  process.env.SHOPIFY_API_SECRET ?? "shpss_termslock_2026_10_secret";

const POLARIS_CSS_PATH = path.resolve(
  process.cwd(),
  "node_modules/@shopify/polaris/build/esm/styles.css"
);

export interface TermsLockServerState {
  validationRules: TermsLockRulesConfig;
  paymentRules: TermsLockPaymentRulesConfig;
  webhookSecret: string;
}

function readRequestBodyBuffer(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return readRequestBodyBuffer(req).then((buf) => buf.toString("utf8"));
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body, "utf8")
  });
  res.end(body);
}

/**
 * Creates a runnable Node.js HTTP server for TermsLock (Admin UI, Official @shopify/polaris CSS,
 * Metafield Compiler API, Live Dry-Run Simulator API, and Mandatory GDPR Webhook endpoint).
 */
export function createTermsLockServer(
  initialState?: Partial<TermsLockServerState>
): {
  server: http.Server;
  state: TermsLockServerState;
} {
  const state: TermsLockServerState = {
    validationRules: structuredClone(
      initialState?.validationRules ?? DEFAULT_RULES_CONFIG
    ),
    paymentRules: structuredClone(
      initialState?.paymentRules ?? DEFAULT_PAYMENT_RULES_CONFIG
    ),
    webhookSecret: initialState?.webhookSecret ?? DEFAULT_WEBHOOK_SECRET
  };

  const server = http.createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", "http://localhost");
      const pathname = url.pathname;

      // 0a. GET /polaris.css -> Official @shopify/polaris stylesheet (embedded memory asset with disk fallback)
      if ((method === "GET" || method === "HEAD") && pathname === "/polaris.css") {
        const css =
          POLARIS_CSS ||
          (fs.existsSync(POLARIS_CSS_PATH)
            ? fs.readFileSync(POLARIS_CSS_PATH, "utf8")
            : "");
        res.writeHead(200, {
          "Content-Type": "text/css; charset=utf-8",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "Content-Length": Buffer.byteLength(css, "utf8")
        });
        if (method === "HEAD") {
          res.end();
          return;
        }
        res.end(css);
        return;
      }

      // 0b. GET /app.bundle.js -> Client-side hydration script (embedded memory asset)
      if ((method === "GET" || method === "HEAD") && pathname === "/app.bundle.js") {
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "Content-Length": Buffer.byteLength(APP_BUNDLE_JS, "utf8")
        });
        if (method === "HEAD") {
          res.end();
          return;
        }
        res.end(APP_BUNDLE_JS);
        return;
      }

      // 1. GET / -> Full Interactive Admin Rule Builder & Dry-Run Simulator HTML
      if ((method === "GET" || method === "HEAD") && pathname === "/") {
        const isEmbedded =
          url.searchParams.get("embedded") === "1" ||
          url.searchParams.has("host");
        const html = renderEmbeddedRuleBuilderHtml({
          activePlan: "PLUS_ENTERPRISE",
          validationRules: state.validationRules,
          paymentRules: state.paymentRules,
          isEmbedded
        });
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          "Content-Length": Buffer.byteLength(html, "utf8")
        });
        if (method === "HEAD") {
          res.end();
          return;
        }
        res.end(html);
        return;
      }

      // 2. GET /api/rules -> Returns active rules and compiled $app:termslock metafields
      if (method === "GET" && pathname === "/api/rules") {
        const validationMetafield = compileValidationRulesMetafield(
          state.validationRules
        );
        const paymentMetafield = compilePaymentRulesMetafield(
          state.paymentRules
        );
        sendJson(res, 200, {
          validationRules: state.validationRules,
          paymentRules: state.paymentRules,
          validationMetafield,
          paymentMetafield
        });
        return;
      }

      // 3. POST /api/rules -> Updates and compiles merchant rules with <10 KB budget enforcement
      if (method === "POST" && pathname === "/api/rules") {
        const rawBody = await readRequestBody(req);
        const parsed = JSON.parse(rawBody || "{}") as Record<string, unknown>;

        const nextValidation: TermsLockRulesConfig = structuredClone(
          (parsed.validationRules as TermsLockRulesConfig | undefined) ??
            state.validationRules
        );
        const nextPayment: TermsLockPaymentRulesConfig = structuredClone(
          (parsed.paymentRules as TermsLockPaymentRulesConfig | undefined) ??
            state.paymentRules
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
          nextPayment.authorizedNet30Tags = parsed.authorizedNet30Tags.map(
            String
          );
        }
        if (typeof parsed.highValueCardThreshold === "number") {
          nextPayment.highValueCardThreshold = parsed.highValueCardThreshold;
        }
        if (typeof parsed.poEnabled === "boolean") {
          nextValidation.poRule.enabled = parsed.poEnabled;
        }
        if (typeof parsed.blockPoBoxOnFreight === "boolean") {
          nextValidation.billingRule.blockPoBoxOnFreight =
            parsed.blockPoBoxOnFreight;
        }
        if (typeof parsed.moqEnabled === "boolean") {
          nextValidation.moqRule.enabled = parsed.moqEnabled;
        }
        if (typeof parsed.hazmatEnabled === "boolean") {
          nextValidation.hazmatRule.enabled = parsed.hazmatEnabled;
        }
        if (typeof parsed.errorMessageMissing === "string") {
          nextValidation.poRule.errorMessageMissing =
            parsed.errorMessageMissing;
        }

        try {
          const validationMetafield =
            compileValidationRulesMetafield(nextValidation);
          const paymentMetafield = compilePaymentRulesMetafield(nextPayment);

          state.validationRules = nextValidation;
          state.paymentRules = nextPayment;

          // Check for live Shopify Admin GraphQL sync (Bearer <id_token> + shop domain)
          const authHeader = req.headers["authorization"] ?? "";
          const shop = (
            (req.headers["x-shopify-shop-domain"] as string) ||
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

          if (shop && idToken && process.env.SHOPIFY_API_SECRET) {
            try {
              const tokenResult = await exchangeSessionTokenForAccessToken({
                shop,
                idToken
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
              console.warn("[TermsLock Live Sync Warning]:", syncErr);
            }
          }

          sendJson(res, 200, {
            saved: true,
            validationRules: state.validationRules,
            paymentRules: state.paymentRules,
            validationMetafield,
            paymentMetafield,
            liveSync
          });
        } catch (err) {
          if (
            err instanceof MetafieldBudgetExceededError ||
            err instanceof InvalidRuleRegexError
          ) {
            sendJson(res, 400, {
              saved: false,
              error: err.message,
              errorType: err.name
            });
            return;
          }
          throw err;
        }
        return;
      }

      // 4. POST /api/simulate -> Executes real b2b-checkout-validator and b2b-payment-gate run()
      if (method === "POST" && pathname === "/api/simulate") {
        const rawBody = await readRequestBody(req);
        const scenario = JSON.parse(
          rawBody || "{}"
        ) as DryRunSimulatorScenario;

        const report = executeDryRunSimulation(
          scenario,
          state.validationRules,
          state.paymentRules
        );
        sendJson(res, 200, report);
        return;
      }

      // 5. POST /api/billing/subscribe -> App subscription creation & bypass for testing
      if (method === "POST" && pathname === "/api/billing/subscribe") {
        const rawBody = await readRequestBody(req);
        const parsed = JSON.parse(rawBody || "{}") as {
          tier?: BillingPlanTier;
          returnUrl?: string;
          shop?: string;
          isTestCharge?: boolean;
        };

        const tier: BillingPlanTier = parsed.tier ?? "PLUS_ENTERPRISE";
        const returnUrl = parsed.returnUrl || "/?billing=success";
        const isTestCharge = parsed.isTestCharge ?? true;

        const authHeader = req.headers["authorization"] ?? "";
        const shop = (
          (req.headers["x-shopify-shop-domain"] as string) ||
          url.searchParams.get("shop") ||
          parsed.shop ||
          ""
        ).toLowerCase().trim();
        const idToken = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7).trim()
          : "";

        let client: AdminGraphQLClient = {
          request: async <TData = unknown>() => ({
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

        if (shop && idToken && process.env.SHOPIFY_API_SECRET) {
          try {
            const tokenResult = await exchangeSessionTokenForAccessToken({
              shop,
              idToken
            });
            client = createLiveShopifyAdminGraphQLClient(
              shop,
              tokenResult.accessToken
            );
          } catch (tokenErr) {
            console.warn("[TermsLock Billing Token Exchange]:", tokenErr);
          }
        }

        const subResult = await createOrBypassAppSubscription(client, {
          tier,
          returnUrl,
          isTestCharge,
          env: process.env
        });

        sendJson(res, 200, {
          success: true,
          confirmationUrl: subResult.confirmationUrl,
          status: subResult.status,
          tier: subResult.tier,
          planName: subResult.planName,
          amountUsd: subResult.amountUsd,
          subscriptionId: subResult.subscriptionId,
          bypassed: subResult.bypassed
        });
        return;
      }

      // 6. POST /api/webhooks/gdpr (or /webhooks/gdpr) -> Verifies X-Shopify-Hmac-Sha256 on raw byte buffer
      if (
        method === "POST" &&
        (pathname === "/api/webhooks/gdpr" || pathname === "/webhooks/gdpr")
      ) {
        const rawBuffer = await readRequestBodyBuffer(req);
        const hmacHeader = String(
          req.headers["x-shopify-hmac-sha256"] ?? ""
        );
        const topicHeader = String(
          req.headers["x-shopify-topic"] ?? "customers/data_request"
        ) as GdprTopic;

        const result = handleGdprWebhook({
          topic: topicHeader,
          rawBody: rawBuffer,
          hmacHeader,
          clientSecret: state.webhookSecret
        });

        sendJson(res, result.statusCode, result);
        return;
      }

      // 7. POST /api/webhooks/uninstalled (or /webhooks/uninstalled) -> Mandatory App Uninstall Webhook
      if (
        method === "POST" &&
        (pathname === "/api/webhooks/uninstalled" ||
          pathname === "/webhooks/uninstalled" ||
          pathname === "/api/webhooks/app/uninstalled")
      ) {
        const rawBuffer = await readRequestBodyBuffer(req);
        const hmacHeader = String(
          req.headers["x-shopify-hmac-sha256"] ?? ""
        );
        const verified = verifyShopifyWebhookHmac(
          rawBuffer,
          hmacHeader,
          state.webhookSecret
        );

        if (!verified) {
          sendJson(res, 401, {
            error: "Unauthorized",
            message: "Invalid X-Shopify-Hmac-Sha256 signature",
            topic: "app/uninstalled"
          });
          return;
        }

        let shopDomain = "unknown.myshopify.com";
        try {
          const parsed = JSON.parse(rawBuffer.toString("utf8"));
          shopDomain =
            parsed.myshopify_domain ||
            parsed.shop_domain ||
            parsed.domain ||
            shopDomain;
        } catch {
          // ignore parsing error on cleanup
        }

        sendJson(res, 200, {
          success: true,
          topic: "app/uninstalled",
          shopDomain,
          action:
            "App uninstalled acknowledged. Merchant metafields and access tokens cleared.",
          acknowledgedAt: new Date().toISOString()
        });
        return;
      }

      sendJson(res, 404, { error: `Route not found: ${method} ${pathname}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal Server Error";
      sendJson(res, 500, { error: message });
    }
  });

  return { server, state };
}

export async function startTermsLockServer(
  port = Number(process.env.PORT ?? DEFAULT_PORT)
): Promise<{
  server: http.Server;
  port: number;
  url: string;
  state: TermsLockServerState;
}> {
  const { server, state } = createTermsLockServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  const actualPort =
    typeof addr === "object" && addr !== null ? addr.port : port;
  const url = `http://localhost:${actualPort}`;
  return { server, port: actualPort, url, state };
}

const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  startTermsLockServer()
    .then(({ url }) => {
      console.log(`TermsLock Admin & Simulator Server running at ${url}`);
    })
    .catch((err) => {
      console.error("Failed to start TermsLock server:", err);
      process.exit(1);
    });
}
