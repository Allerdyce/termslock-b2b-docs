import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type http from "node:http";
import { startTermsLockServer } from "../src/server.ts";
import {
  clearTokenCache,
  exchangeSessionTokenForAccessToken,
  createLiveShopifyAdminGraphQLClient,
  getCachedAccessToken
} from "../web/admin/shopify-oauth.ts";

describe("Phase P7: Production Shopify OAuth 2.0 Token Exchange, Live GraphQL Sync & Billing API", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    clearTokenCache();
    const started = await startTermsLockServer(0);
    server = started.server;
    baseUrl = started.url;
  });

  afterAll(async () => {
    clearTokenCache();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("1. exchanges App Bridge session token (id_token) for offline access token and caches it in memory", async () => {
    const mockShop = "apex-industrial-wholesale.myshopify.com";
    const mockIdToken = "mock_jwt_session_token_from_app_bridge_v4";
    let capturedBody: any = null;

    const mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse((init?.body as string) || "{}");
      return new Response(
        JSON.stringify({
          access_token: "shpat_live_production_offline_token_2026",
          scope: "write_cart_validations,write_payment_customizations"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    // First call: makes network request
    const result1 = await exchangeSessionTokenForAccessToken({
      shop: mockShop,
      idToken: mockIdToken,
      clientId: "test_client_id",
      clientSecret: "test_client_secret",
      fetchFn: mockFetch as unknown as typeof fetch
    });

    expect(result1.shop).toBe(mockShop);
    expect(result1.accessToken).toBe("shpat_live_production_offline_token_2026");
    expect(result1.cached).toBe(false);

    expect(capturedBody).not.toBeNull();
    expect(capturedBody?.grant_type).toBe(
      "urn:ietf:params:oauth:grant-type:token-exchange"
    );
    expect(capturedBody?.subject_token).toBe(mockIdToken);
    expect(capturedBody?.subject_token_type).toBe(
      "urn:ietf:params:oauth:token-type:id_token"
    );
    expect(capturedBody?.requested_token_type).toBe(
      "urn:shopify:params:oauth:token-type:offline-access-token"
    );

    // Second call: returned from memory cache
    const result2 = await exchangeSessionTokenForAccessToken({
      shop: mockShop,
      idToken: mockIdToken
    });
    expect(result2.cached).toBe(true);
    expect(result2.accessToken).toBe("shpat_live_production_offline_token_2026");
    expect(getCachedAccessToken(mockShop)).toBe(
      "shpat_live_production_offline_token_2026"
    );
  });

  it("2. dispatches queries through createLiveShopifyAdminGraphQLClient to 2026-10 GraphQL endpoint", async () => {
    let capturedHeaders: HeadersInit | undefined;
    let capturedUrl: string | undefined;

    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers;
      return new Response(
        JSON.stringify({
          data: {
            shop: { name: "Apex Industrial B2B" }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const client = createLiveShopifyAdminGraphQLClient(
      "apex-industrial-wholesale.myshopify.com",
      "shpat_mock_12345",
      "2026-10",
      mockFetch as unknown as typeof fetch
    );

    const res = await client.request<{ shop: { name: string } }>(
      "{ shop { name } }",
      {}
    );
    expect(capturedUrl).toBe(
      "https://apex-industrial-wholesale.myshopify.com/admin/api/2026-10/graphql.json"
    );
    expect((capturedHeaders as Record<string, string>)["X-Shopify-Access-Token"]).toBe(
      "shpat_mock_12345"
    );
    expect(res.data?.shop.name).toBe("Apex Industrial B2B");
  });

  it("3. POST /api/rules gracefully handles local preview mode when no live session token is provided", async () => {
    const res = await fetch(`${baseUrl}/api/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poRegexPattern: "^PO-[0-9]{8}$",
        poSubtotalThreshold: 2000
      })
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      saved: boolean;
      liveSync: { synced: boolean };
      validationRules: { poRule: { regexPattern: string } };
    };

    expect(data.saved).toBe(true);
    expect(data.liveSync.synced).toBe(false);
    expect(data.validationRules.poRule.regexPattern).toBe("^PO-[0-9]{8}$");
  });

  it("4. POST /api/billing/subscribe initiates app subscription creation and returns confirmationUrl", async () => {
    // 1. Subscribe to Plus Plan
    const plusRes = await fetch(`${baseUrl}/api/billing/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: "PLUS_ENTERPRISE",
        returnUrl: "https://apex-industrial-wholesale.myshopify.com/admin/apps/termslock?billing=success",
        shop: "apex-industrial-wholesale.myshopify.com"
      })
    });

    expect(plusRes.status).toBe(200);
    const plusData = (await plusRes.json()) as {
      success: boolean;
      confirmationUrl: string;
      tier: string;
      amountUsd: number;
      planName: string;
    };

    expect(plusData.success).toBe(true);
    expect(plusData.tier).toBe("PLUS_ENTERPRISE");
    expect(plusData.amountUsd).toBe(99.0);
    expect(plusData.planName).toBe("Shopify Plus & Enterprise Wholesale Plan");
    expect(plusData.confirmationUrl).toContain("billing=success");

    // 2. Subscribe to B2B Standard Plan
    const stdRes = await fetch(`${baseUrl}/api/billing/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: "B2B_STANDARD",
        returnUrl: "https://apex-industrial-wholesale.myshopify.com/admin/apps/termslock?billing=success"
      })
    });

    expect(stdRes.status).toBe(200);
    const stdData = (await stdRes.json()) as {
      success: boolean;
      tier: string;
      amountUsd: number;
    };
    expect(stdData.tier).toBe("B2B_STANDARD");
    expect(stdData.amountUsd).toBe(39.0);
  });
});
