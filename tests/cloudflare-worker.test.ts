import crypto from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import worker, {
  resetWorkerState,
  getWorkerState,
  type Env
} from "../src/worker.ts";

describe("Phase P9: Cloudflare Workers Edge Adapter Integration Suite", () => {
  const mockEnv: Env = {
    SHOPIFY_API_KEY: "termslock_mock_client_id_2026",
    SHOPIFY_API_SECRET: "shpss_termslock_2026_10_secret",
    SCOPES: "read_orders,write_checkouts,read_customer_payment_methods",
    DEFAULT_WEBHOOK_SECRET: "shpss_termslock_2026_10_secret"
  };

  beforeEach(() => {
    resetWorkerState();
  });

  it("1. GET /polaris.css serves pre-bundled Polaris stylesheet with correct headers and zero ENOENT risk", async () => {
    const req = new Request("https://termslock.evidencepair.workers.dev/polaris.css", {
      method: "GET"
    });
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
    expect(res.headers.get("cache-control")).toContain("public");
    const css = await res.text();
    expect(css.length).toBeGreaterThan(100_000);
    expect(css).toContain(".Polaris-Button");
    expect(css).toContain("--p-color-bg-surface");

    // HEAD request check
    const headReq = new Request("https://termslock.evidencepair.workers.dev/polaris.css", {
      method: "HEAD"
    });
    const headRes = await worker.fetch(headReq, mockEnv);
    expect(headRes.status).toBe(200);
    expect(headRes.headers.get("content-type")).toContain("text/css");
  });

  it("2. GET /app.bundle.js serves pre-bundled client hydration script directly from memory", async () => {
    const req = new Request("https://termslock.evidencepair.workers.dev/app.bundle.js", {
      method: "GET"
    });
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/javascript");
    expect(res.headers.get("cache-control")).toContain("public");
    const script = await res.text();
    expect(script.length).toBeGreaterThan(10_000);
    expect(script).toContain("save-rules-btn");
    expect(script).toContain("run-simulator-btn");
    expect(script).toContain("updateActiveRuleSummary");
  });

  it("3. GET / renders interactive Admin Rule Builder & Dry-Run Simulator HTML", async () => {
    const req = new Request("https://termslock.evidencepair.workers.dev/", {
      method: "GET"
    });
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain('meta name="shopify-api-key"');
    expect(html).toContain("app-bridge.js");
    expect(html).toContain('/app.bundle.js');
    expect(html).toContain('/polaris.css');
    expect(html).toContain('id="rule-builder-form"');
    expect(html).toContain('id="simulator-form"');
    expect(html).toContain("admin-host-topbar");
  });

  it("4. GET /?embedded=1 strips simulated outer admin chrome in embedded iframe mode", async () => {
    const req = new Request("https://termslock.evidencepair.workers.dev/?embedded=1", {
      method: "GET"
    });
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("is-embedded");
    expect(html).not.toContain('<header class="shopify-host-topbar admin-host-topbar"');
    expect(html).not.toContain('<aside class="shopify-host-sidebar admin-host-sidebar"');
    expect(html).toContain("ui-title-bar");
  });

  it("5. GET /api/rules returns current state and valid <10 KB compiled metafields", async () => {
    const req = new Request("https://termslock.evidencepair.workers.dev/api/rules", {
      method: "GET"
    });
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      validationMetafield: { byteLength: number; namespace: string; key: string };
      paymentMetafield: { byteLength: number; namespace: string; key: string };
    };
    expect(data.validationMetafield.namespace).toBe("$app:termslock");
    expect(data.validationMetafield.key).toBe("rules_config");
    expect(data.validationMetafield.byteLength).toBeLessThan(10_240);
    expect(data.paymentMetafield.byteLength).toBeLessThan(10_240);
  });

  it("6. POST /api/rules updates rules and compiles within budget", async () => {
    const req = new Request("https://termslock.evidencepair.workers.dev/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poRegexPattern: "^PO-[0-9]{8}$",
        poSubtotalThreshold: 1500,
        minimumSubtotal: 750,
        authorizedNet30Tags: ["Net-30", "VIP-Tier"],
        highValueCardThreshold: 7500
      })
    });
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      saved: boolean;
      validationRules: { poRule: { regexPattern: string; subtotalThreshold: number } };
      paymentRules: { authorizedNet30Tags: string[]; highValueCardThreshold: number };
      validationMetafield: { byteLength: number };
    };
    expect(data.saved).toBe(true);
    expect(data.validationRules.poRule.regexPattern).toBe("^PO-[0-9]{8}$");
    expect(data.validationRules.poRule.subtotalThreshold).toBe(1500);
    expect(data.paymentRules.authorizedNet30Tags).toContain("VIP-Tier");
    expect(data.validationMetafield.byteLength).toBeLessThan(10_240);

    // Verify worker internal state reflects update
    expect(getWorkerState().validationRules.poRule.regexPattern).toBe("^PO-[0-9]{8}$");
  });

  it("7. POST /api/rules rejects invalid regex and payload exceeding 10 KB budget with 400", async () => {
    // Invalid regex
    const badRegexReq = new Request("https://termslock.evidencepair.workers.dev/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poRegexPattern: "(unclosed-group"
      })
    });
    const badRegexRes = await worker.fetch(badRegexReq, mockEnv);
    expect(badRegexRes.status).toBe(400);
    const badRegexData = (await badRegexRes.json()) as { errorType: string };
    expect(badRegexData.errorType).toBe("InvalidRuleRegexError");

    // Exceeding 10 KB budget
    const bloatReq = new Request("https://termslock.evidencepair.workers.dev/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        errorMessageMissing: "X".repeat(11_000)
      })
    });
    const bloatRes = await worker.fetch(bloatReq, mockEnv);
    expect(bloatRes.status).toBe(400);
    const bloatData = (await bloatRes.json()) as { errorType: string };
    expect(bloatData.errorType).toBe("MetafieldBudgetExceededError");
  });

  it("8. POST /api/simulate runs deterministic checkout validation & payment rules", async () => {
    // Failing scenario: INVALID-123 and P.O. Box
    const failReq = new Request("https://termslock.evidencepair.workers.dev/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartSubtotal: 1250,
        customerTags: [],
        purchasingCompanyName: "Apex Industrial Supply LLC",
        poNumber: "INVALID-123",
        billingCompany: "Apex Industrial Supply LLC",
        billingAddress1: "P.O. Box 409",
        lineItems: [
          {
            sku: "FREIGHT-CASE6-200",
            quantity: 12,
            productTags: ["Freight", "Wholesale-Case-6"]
          }
        ]
      })
    });
    const failRes = await worker.fetch(failReq, mockEnv);
    expect(failRes.status).toBe(200);
    const failReport = (await failRes.json()) as {
      checkoutPassed: boolean;
      validationErrors: { target: string }[];
      paymentMethodsPreview: { originalName: string; visible: boolean }[];
    };
    expect(failReport.checkoutPassed).toBe(false);
    expect(failReport.validationErrors.some((e) => e.target === "$.cart.poNumber")).toBe(true);
    expect(failReport.validationErrors.some((e) => e.target === "$.cart.billingAddress.address1")).toBe(true);

    // Passing scenario: PO-849201 and 400 Market St + Net-30
    const passReq = new Request("https://termslock.evidencepair.workers.dev/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartSubtotal: 1250,
        customerTags: ["Net-30"],
        purchasingCompanyName: "Apex Industrial Supply LLC",
        poNumber: "PO-849201",
        billingCompany: "Apex Industrial Supply LLC",
        billingAddress1: "400 Market St",
        lineItems: [
          {
            sku: "FREIGHT-CASE6-200",
            quantity: 12,
            productTags: ["Freight", "Wholesale-Case-6"]
          }
        ]
      })
    });
    const passRes = await worker.fetch(passReq, mockEnv);
    expect(passRes.status).toBe(200);
    const passReport = (await passRes.json()) as {
      checkoutPassed: boolean;
      validationErrors: unknown[];
      paymentMethodsPreview: { originalName: string; visible: boolean; promotedToTop: boolean }[];
    };
    expect(passReport.checkoutPassed).toBe(true);
    expect(passReport.validationErrors).toHaveLength(0);
    const net30 = passReport.paymentMethodsPreview.find((p) => p.originalName.includes("Net-30"));
    expect(net30?.visible).toBe(true);
    expect(net30?.promotedToTop).toBe(true);
  });

  it("9. POST /api/billing/subscribe returns active subscription confirmationUrl", async () => {
    const req = new Request("https://termslock.evidencepair.workers.dev/api/billing/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: "PLUS_ENTERPRISE",
        returnUrl: "https://admin.shopify.com/store/termslock-b2b-sandbox/apps/termslock?billing=success",
        isTestCharge: true
      })
    });
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      success: boolean;
      confirmationUrl: string;
      tier: string;
      amountUsd: number;
    };
    expect(data.success).toBe(true);
    expect(data.confirmationUrl).toContain("billing=success");
    expect(data.tier).toBe("PLUS_ENTERPRISE");
    expect(data.amountUsd).toBe(99);
  });

  it("10. POST /api/webhooks/gdpr verifies HMAC via Web Crypto with 0 customer PII stored", async () => {
    const secret = "shpss_termslock_2026_10_secret";
    const bodyText = JSON.stringify({
      shop_id: 100200,
      shop_domain: "termslock-b2b-sandbox.myshopify.com",
      customer: { id: 5544, email: "b2b-procurement@example.com" }
    });
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(bodyText, "utf8")
      .digest("base64");

    const okReq = new Request("https://termslock.evidencepair.workers.dev/api/webhooks/gdpr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Topic": "customers/data_request",
        "X-Shopify-Hmac-Sha256": hmac
      },
      body: bodyText
    });
    const okRes = await worker.fetch(okReq, mockEnv);
    expect(okRes.status).toBe(200);
    const okData = (await okRes.json()) as {
      statusCode: number;
      piiStoredCount: number;
      topic: string;
      action: string;
    };
    expect(okData.statusCode).toBe(200);
    expect(okData.piiStoredCount).toBe(0);
    expect(okData.topic).toBe("customers/data_request");
    expect(okData.action).toContain("0 external customer PII");

    // Invalid HMAC test
    const failReq = new Request("https://termslock.evidencepair.workers.dev/api/webhooks/gdpr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Topic": "customers/redact",
        "X-Shopify-Hmac-Sha256": "fake_invalid_hmac"
      },
      body: bodyText
    });
    const failRes = await worker.fetch(failReq, mockEnv);
    expect(failRes.status).toBe(401);
  });

  it("11. POST /api/webhooks/uninstalled processes app/uninstalled webhook via Web Crypto HMAC", async () => {
    const secret = "shpss_termslock_2026_10_secret";
    const bodyText = JSON.stringify({
      myshopify_domain: "termslock-b2b-sandbox.myshopify.com",
      id: 88776655
    });
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(bodyText, "utf8")
      .digest("base64");

    const req = new Request("https://termslock.evidencepair.workers.dev/api/webhooks/uninstalled", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Topic": "app/uninstalled",
        "X-Shopify-Hmac-Sha256": hmac
      },
      body: bodyText
    });
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      success: boolean;
      topic: string;
      shopDomain: string;
      action: string;
    };
    expect(data.success).toBe(true);
    expect(data.topic).toBe("app/uninstalled");
    expect(data.shopDomain).toBe("termslock-b2b-sandbox.myshopify.com");
  });

  it("12. Unknown route returns 404 with Route not found JSON", async () => {
    const req = new Request("https://termslock.evidencepair.workers.dev/non-existent-path", {
      method: "GET"
    });
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(404);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("Route not found: GET /non-existent-path");
  });

  it("13. GET /privacy serves public Zero-Login Privacy Policy with zero-PII architecture", async () => {
    const req = new Request("https://termslock-b2b.evidencepair.workers.dev/privacy", {
      method: "GET"
    });
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("Privacy Policy &amp; GDPR Compliance");
    expect(html).toContain("EvidencePair LLC");
    expect(html).toContain("support@evidencepair.com");
  });

  it("14. GET /demo serves public Interactive Demo and Video Walkthrough page", async () => {
    const req = new Request("https://termslock-b2b.evidencepair.workers.dev/demo", {
      method: "GET"
    });
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("TermsLock: B2B PO &amp; Net-30");
    expect(html).toContain("Recorded Video Screencast");
  });
});
