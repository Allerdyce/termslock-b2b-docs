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
  type GdprTopic
} from "../web/webhooks/gdpr-handlers.ts";

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

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
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

      // 0. GET /polaris.css -> Official @shopify/polaris stylesheet from node_modules
      if ((method === "GET" || method === "HEAD") && pathname === "/polaris.css") {
        const css = fs.existsSync(POLARIS_CSS_PATH)
          ? fs.readFileSync(POLARIS_CSS_PATH, "utf8")
          : "";
        res.writeHead(200, {
          "Content-Type": "text/css; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Length": Buffer.byteLength(css, "utf8")
        });
        if (method === "HEAD") {
          res.end();
          return;
        }
        res.end(css);
        return;
      }

      // 1. GET / -> Full Interactive Admin Rule Builder & Dry-Run Simulator HTML
      if ((method === "GET" || method === "HEAD") && pathname === "/") {
        const html = renderEmbeddedRuleBuilderHtml({
          activePlan: "PLUS_ENTERPRISE",
          validationRules: state.validationRules,
          paymentRules: state.paymentRules
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

          sendJson(res, 200, {
            saved: true,
            validationRules: state.validationRules,
            paymentRules: state.paymentRules,
            validationMetafield,
            paymentMetafield
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

      // 5. POST /api/webhooks/gdpr (or /webhooks/gdpr) -> Verifies X-Shopify-Hmac-Sha256
      if (
        method === "POST" &&
        (pathname === "/api/webhooks/gdpr" || pathname === "/webhooks/gdpr")
      ) {
        const rawBody = await readRequestBody(req);
        const hmacHeader = String(
          req.headers["x-shopify-hmac-sha256"] ?? ""
        );
        const topicHeader = String(
          req.headers["x-shopify-topic"] ?? "customers/data_request"
        ) as GdprTopic;

        const result = handleGdprWebhook({
          topic: topicHeader,
          rawBody,
          hmacHeader,
          clientSecret: state.webhookSecret
        });

        sendJson(res, result.statusCode, result);
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
