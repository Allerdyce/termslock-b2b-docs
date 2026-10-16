import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_WEBHOOK_SECRET,
  startTermsLockServer
} from "../src/server.ts";
import type http from "node:http";

describe("Phase P4 (QA Gate 5): End-to-End HTTP Server + Wasm Neutral Bundle Integration Suite", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const started = await startTermsLockServer(0);
    server = started.server;
    baseUrl = started.url;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("33. GET / serves interactive Admin Rule Builder & Dry-Run Simulator with App Bridge v4 and Polaris tokens", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain('meta name="shopify-api-key"');
    expect(html).toContain("app-bridge.js");
    expect(html).toContain('id="rule-builder-form"');
    expect(html).toContain('id="simulator-form"');
    expect(html).toContain("termslock-checkout-validator");
    expect(html).toContain("termslock-payment-gate");
  });

  it("34. GET /api/rules & POST /api/rules persist updated PO regex (^PO-[0-9]{6}$) and return <10 KB $app:termslock metafields", async () => {
    const getRes = await fetch(`${baseUrl}/api/rules`);
    expect(getRes.status).toBe(200);
    const initial = (await getRes.json()) as {
      validationMetafield: { byteLength: number; value: string };
    };
    expect(initial.validationMetafield.byteLength).toBeLessThan(10_240);

    const postRes = await fetch(`${baseUrl}/api/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poRegexPattern: "^PO-[0-9]{6}$",
        poSubtotalThreshold: 1000,
        minimumSubtotal: 500,
        authorizedNet30Tags: ["Net-30", "Approved-Wholesale"],
        highValueCardThreshold: 5000
      })
    });
    expect(postRes.status).toBe(200);
    const updated = (await postRes.json()) as {
      saved: boolean;
      validationRules: { poRule: { regexPattern: string } };
      validationMetafield: { byteLength: number; value: string };
      paymentMetafield: { byteLength: number; value: string };
    };
    expect(updated.saved).toBe(true);
    expect(updated.validationRules.poRule.regexPattern).toBe("^PO-[0-9]{6}$");
    expect(updated.validationMetafield.byteLength).toBeLessThan(10_240);
    expect(updated.paymentMetafield.byteLength).toBeLessThan(10_240);
    expect(updated.validationMetafield.value).toContain('"^PO-[0-9]{6}$"');
  });

  it("35. POST /api/rules returns 400 Bad Request when metafield payload exceeds <10 KB budget or regex is invalid", async () => {
    const bloatRes = await fetch(`${baseUrl}/api/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        errorMessageMissing: "B".repeat(10_500)
      })
    });
    expect(bloatRes.status).toBe(400);
    const bloatData = (await bloatRes.json()) as {
      saved: boolean;
      errorType: string;
    };
    expect(bloatData.saved).toBe(false);
    expect(bloatData.errorType).toBe("MetafieldBudgetExceededError");

    const badRegexRes = await fetch(`${baseUrl}/api/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poRegexPattern: "[unclosed"
      })
    });
    expect(badRegexRes.status).toBe(400);
  });

  it("36. POST /api/simulate executes real Functions for failure (INVALID-123 + P.O. Box 409) and pass (PO-849201 + 400 Market St + Net-30)", async () => {
    // Failure simulation
    const failRes = await fetch(`${baseUrl}/api/simulate`, {
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
    expect(failRes.status).toBe(200);
    const failReport = (await failRes.json()) as {
      checkoutPassed: boolean;
      validationErrors: { target: string; localizedMessage: string }[];
      paymentMethodsPreview: { originalName: string; visible: boolean }[];
    };
    expect(failReport.checkoutPassed).toBe(false);
    expect(
      failReport.validationErrors.some((e) => e.target === "$.cart.poNumber")
    ).toBe(true);
    expect(
      failReport.validationErrors.some(
        (e) => e.target === "$.cart.billingAddress.address1"
      )
    ).toBe(true);
    const hiddenNet30 = failReport.paymentMethodsPreview.find((pm) =>
      pm.originalName.includes("Net-30")
    );
    expect(hiddenNet30?.visible).toBe(false);

    // Pass simulation
    const passRes = await fetch(`${baseUrl}/api/simulate`, {
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
    expect(passRes.status).toBe(200);
    const passReport = (await passRes.json()) as {
      checkoutPassed: boolean;
      validationErrors: unknown[];
      paymentMethodsPreview: {
        originalName: string;
        displayName: string;
        visible: boolean;
        promotedToTop: boolean;
      }[];
    };
    expect(passReport.checkoutPassed).toBe(true);
    expect(passReport.validationErrors).toHaveLength(0);
    const promotedNet30 = passReport.paymentMethodsPreview.find((pm) =>
      pm.originalName.includes("Net-30")
    );
    expect(promotedNet30?.visible).toBe(true);
    expect(promotedNet30?.promotedToTop).toBe(true);
  });

  it("37. POST /api/webhooks/gdpr returns 200 OK on valid X-Shopify-Hmac-Sha256 and 401 Unauthorized on invalid HMAC", async () => {
    const body = JSON.stringify({
      shop_id: 778899,
      shop_domain: "termslock-b2b-dev.myshopify.com",
      customer: { id: 12345, email: "buyer@example.com" }
    });
    const validHmac = crypto
      .createHmac("sha256", DEFAULT_WEBHOOK_SECRET)
      .update(body, "utf8")
      .digest("base64");

    const okRes = await fetch(`${baseUrl}/api/webhooks/gdpr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Topic": "customers/data_request",
        "X-Shopify-Hmac-Sha256": validHmac
      },
      body
    });
    expect(okRes.status).toBe(200);

    const unauthorizedRes = await fetch(`${baseUrl}/api/webhooks/gdpr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Topic": "customers/redact",
        "X-Shopify-Hmac-Sha256": "forged_invalid_signature"
      },
      body
    });
    expect(unauthorizedRes.status).toBe(401);
  });

  it("38. verifies --platform=neutral Wasm bundles (<50 KB, 0 Node.js globals) and shopify.extension.toml targets", async () => {
    const validatorBundlePath = path.resolve(
      process.cwd(),
      "dist/validator.bundle.mjs"
    );
    const paymentBundlePath = path.resolve(
      process.cwd(),
      "dist/payment-gate.bundle.mjs"
    );

    const valCode = fs.readFileSync(validatorBundlePath, "utf8");
    const payCode = fs.readFileSync(paymentBundlePath, "utf8");

    expect(Buffer.byteLength(valCode, "utf8")).toBeLessThan(50 * 1024);
    expect(Buffer.byteLength(payCode, "utf8")).toBeLessThan(50 * 1024);

    // Zero Node.js built-ins inside Wasm bundles
    const forbiddenGlobals = /\b(Buffer|process|require|crypto|fs)\b/;
    expect(forbiddenGlobals.test(valCode)).toBe(false);
    expect(forbiddenGlobals.test(payCode)).toBe(false);

    // Verify shopify.app.toml and shopify.extension.toml configurations
    const appToml = fs.readFileSync(
      path.resolve(process.cwd(), "shopify.app.toml"),
      "utf8"
    );
    expect(appToml).toContain('api_version = "2026-10"');
    expect(appToml).toContain("write_cart_validations");
    expect(appToml).toContain("write_payment_customizations");

    const valExtToml = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "extensions/b2b-checkout-validator/shopify.extension.toml"
      ),
      "utf8"
    );
    expect(valExtToml).toContain('handle = "termslock-checkout-validator"');
    expect(valExtToml).toContain(
      'target = "purchase.cart-checkout-validation.run"'
    );

    const payExtToml = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "extensions/b2b-payment-gate/shopify.extension.toml"
      ),
      "utf8"
    );
    expect(payExtToml).toContain('handle = "termslock-payment-gate"');
    expect(payExtToml).toContain(
      'target = "purchase.payment-customization.run"'
    );
  });

  it("39. GET /?embedded=1 renders embedded iframe mode without outer Admin Top Bar and Left Sidebar", async () => {
    const standaloneRes = await fetch(`${baseUrl}/`);
    const standaloneHtml = await standaloneRes.text();
    expect(standaloneHtml).toContain("admin-host-topbar");
    expect(standaloneHtml).toContain("admin-host-sidebar");
    expect(standaloneHtml).toContain("ui-title-bar");

    const embeddedRes = await fetch(`${baseUrl}/?embedded=1`);
    expect(embeddedRes.status).toBe(200);
    const embeddedHtml = await embeddedRes.text();
    expect(embeddedHtml).toContain("is-embedded");
    expect(embeddedHtml).not.toContain('<header class="shopify-host-topbar admin-host-topbar"');
    expect(embeddedHtml).not.toContain('<aside class="shopify-host-sidebar admin-host-sidebar"');
    expect(embeddedHtml).toContain("ui-title-bar");
    expect(embeddedHtml).toContain('id="rule-builder-form"');
  });

  it("40. POST /api/webhooks/uninstalled returns 200 OK on valid raw buffer HMAC and 401 on invalid HMAC", async () => {
    const rawPayload = JSON.stringify({
      myshopify_domain: "termslock-b2b-dev.myshopify.com",
      id: 99887766
    });
    const validHmac = crypto
      .createHmac("sha256", DEFAULT_WEBHOOK_SECRET)
      .update(rawPayload, "utf8")
      .digest("base64");

    const okRes = await fetch(`${baseUrl}/api/webhooks/uninstalled`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Topic": "app/uninstalled",
        "X-Shopify-Hmac-Sha256": validHmac
      },
      body: rawPayload
    });
    expect(okRes.status).toBe(200);
    const okJson = (await okRes.json()) as { success: boolean; topic: string };
    expect(okJson.success).toBe(true);
    expect(okJson.topic).toBe("app/uninstalled");

    const unauthorizedRes = await fetch(`${baseUrl}/api/webhooks/uninstalled`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Topic": "app/uninstalled",
        "X-Shopify-Hmac-Sha256": "invalid_forged_hmac"
      },
      body: rawPayload
    });
    expect(unauthorizedRes.status).toBe(401);
  });

  it("41. verifies raw UTF-8 request buffer HMAC against custom whitespace, and shopify.app.toml compliance configuration", async () => {
    // Non-canonical JSON with extra indentation and spaced keys
    const nonCanonicalBody = `{\n  "shop_id": 123456,\n  "shop_domain": "termslock-raw-test.myshopify.com",\n  "customer": {\n    "id": 98765\n  }\n}`;
    const validHmac = crypto
      .createHmac("sha256", DEFAULT_WEBHOOK_SECRET)
      .update(nonCanonicalBody, "utf8")
      .digest("base64");

    const res = await fetch(`${baseUrl}/api/webhooks/gdpr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Topic": "customers/data_request",
        "X-Shopify-Hmac-Sha256": validHmac
      },
      body: nonCanonicalBody
    });
    expect(res.status).toBe(200);

    const appToml = fs.readFileSync(
      path.resolve(process.cwd(), "shopify.app.toml"),
      "utf8"
    );
    expect(appToml).toContain("compliance_topics");
    expect(appToml).toContain("app/uninstalled");
    expect(appToml).toContain("[pos]");
    expect(appToml).toContain("embedded = false");
    expect(appToml).toContain("/api/auth/callback");
  });

  it("42. GET /polaris.css serves embedded Polaris stylesheet with Cache-Control headers", async () => {
    const res = await fetch(`${baseUrl}/polaris.css`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
    expect(res.headers.get("cache-control")).toContain("public");
    const css = await res.text();
    expect(css.length).toBeGreaterThan(100_000);
    expect(css).toContain(".Polaris-Button");

    const headRes = await fetch(`${baseUrl}/polaris.css`, { method: "HEAD" });
    expect(headRes.status).toBe(200);
    expect(headRes.headers.get("content-type")).toContain("text/css");
  });

  it("43. GET /app.bundle.js serves embedded client hydration script with Cache-Control headers", async () => {
    const res = await fetch(`${baseUrl}/app.bundle.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/javascript");
    expect(res.headers.get("cache-control")).toContain("public");
    const js = await res.text();
    expect(js.length).toBeGreaterThan(10_000);
    expect(js).toContain("save-rules-btn");
    expect(js).toContain("run-simulator-btn");

    const headRes = await fetch(`${baseUrl}/app.bundle.js`, { method: "HEAD" });
    expect(headRes.status).toBe(200);
    expect(headRes.headers.get("content-type")).toContain("application/javascript");
  });
});

