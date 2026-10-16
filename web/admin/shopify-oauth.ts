import type { AdminGraphQLClient } from "./graphql-mutations.ts";

export interface TokenExchangeParams {
  shop: string;
  idToken: string;
  clientId?: string;
  clientSecret?: string;
  fetchFn?: typeof fetch;
}

export interface ShopifyAccessTokenResult {
  shop: string;
  accessToken: string;
  scope?: string;
  cached: boolean;
}

// Strict Shopify myshopify.com hostname allowlist (prevents SSRF and weak shop validation)
const SHOP_DOMAIN_REGEX = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

export function isValidShopifyShopDomain(shop: string): boolean {
  const normalized = shop.toLowerCase().trim();
  return SHOP_DOMAIN_REGEX.test(normalized) && normalized.length <= 255;
}

/**
 * Builds a dynamic Content-Security-Policy frame-ancestors directive scoped to the
 * validated merchant shop domain and https://admin.shopify.com.
 */
export function buildEmbeddedCspHeader(shopParam?: string | null): string {
  const normalized = (shopParam ?? "").toLowerCase().trim();
  if (isValidShopifyShopDomain(normalized)) {
    return `frame-ancestors https://${normalized} https://admin.shopify.com;`;
  }
  return "frame-ancestors https://*.myshopify.com https://admin.shopify.com;";
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Cryptographically verifies an App Bridge HS256 Session Token (JWT) and extracts
 * the authenticated shop domain from the `dest` claim.
 */
export async function verifyAndExtractShopFromSessionToken(
  idToken: string,
  clientSecret: string
): Promise<string | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(clientSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signingInput = encoder.encode(`${headerB64}.${payloadB64}`);
    const sigBytes = base64UrlToUint8Array(signatureB64);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes as BufferSource, signingInput);
    if (!valid) {
      return null;
    }

    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(payloadB64));
    const payload = JSON.parse(payloadJson) as {
      dest?: string;
      exp?: number;
      nbf?: number;
    };

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp + 5 < nowSec) {
      return null;
    }
    if (typeof payload.nbf === "number" && payload.nbf - 5 > nowSec) {
      return null;
    }

    if (typeof payload.dest === "string") {
      const destHost = payload.dest.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase().trim();
      if (isValidShopifyShopDomain(destHost)) {
        return destHost;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// In-memory token cache keyed by normalized shop domain and bound to the verified subjectToken
const tokenCache = new Map<
  string,
  { accessToken: string; scope?: string; cachedAt: number; subjectToken: string }
>();

export function clearTokenCache(): void {
  tokenCache.clear();
}

export function getCachedAccessToken(shop: string): string | undefined {
  const normalized = shop.toLowerCase().trim();
  if (!isValidShopifyShopDomain(normalized)) {
    return undefined;
  }
  return tokenCache.get(normalized)?.accessToken;
}

/**
 * Exchanges a Shopify App Bridge Session Token (id_token) for an offline Access Token
 * using Shopify's Managed Installation Token Exchange specification (RFC 8693).
 *
 * Endpoint: POST https://${shop}/admin/oauth/access_token
 * Grant Type: urn:ietf:params:oauth:grant-type:token-exchange
 * Subject Token Type: urn:ietf:params:oauth:token-type:id_token
 * Requested Token Type: urn:shopify:params:oauth:token-type:offline-access-token
 */
export async function exchangeSessionTokenForAccessToken(
  params: TokenExchangeParams
): Promise<ShopifyAccessTokenResult> {
  const shop = params.shop.toLowerCase().trim();
  if (!isValidShopifyShopDomain(shop)) {
    throw new Error(`Invalid Shopify shop domain: ${shop}`);
  }
  if (!params.idToken || typeof params.idToken !== "string") {
    throw new Error("Missing Shopify session token (idToken)");
  }

  const clientId =
    params.clientId ??
    process.env.SHOPIFY_API_KEY ??
    "termslock_mock_client_id_2026";
  const clientSecret =
    params.clientSecret ??
    process.env.SHOPIFY_API_SECRET ??
    "termslock_mock_secret_2026";
  const fetchFn = params.fetchFn ?? fetch;

  // Check cache first (must match the exact subjectToken and be within 55m TTL)
  const existing = tokenCache.get(shop);
  if (
    existing &&
    existing.subjectToken === params.idToken &&
    Date.now() - existing.cachedAt < 55 * 60 * 1000
  ) {
    return {
      shop,
      accessToken: existing.accessToken,
      scope: existing.scope,
      cached: true
    };
  }

  const endpoint = `https://${shop}/admin/oauth/access_token`;
  const bodyPayload = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    subject_token: params.idToken,
    subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token"
  };

  const response = await fetchFn(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(bodyPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Shopify Token Exchange failed (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  const data = (await response.json()) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new Error(
      `Shopify Token Exchange did not return an access_token: ${data.error_description || data.error || JSON.stringify(data)}`
    );
  }

  tokenCache.set(shop, {
    accessToken: data.access_token,
    scope: data.scope,
    cachedAt: Date.now(),
    subjectToken: params.idToken
  });

  return {
    shop,
    accessToken: data.access_token,
    scope: data.scope,
    cached: false
  };
}

/**
 * Creates an AdminGraphQLClient that dispatches queries to a live Shopify Admin GraphQL endpoint.
 */
export function createLiveShopifyAdminGraphQLClient(
  shop: string,
  accessToken: string,
  apiVersion = "2026-10",
  fetchFn: typeof fetch = fetch
): AdminGraphQLClient {
  const normalizedShop = shop.toLowerCase().trim();
  if (!isValidShopifyShopDomain(normalizedShop)) {
    throw new Error(`Invalid Shopify shop domain: ${normalizedShop}`);
  }
  const safeApiVersion = /^[0-9]{4}-[0-9]{2}$/.test(apiVersion) ? apiVersion : "2026-10";
  const endpoint = `https://${normalizedShop}/admin/api/${safeApiVersion}/graphql.json`;

  return {
    async request<TData = unknown>(
      query: string,
      variables: Record<string, unknown>
    ): Promise<{ data?: TData; errors?: { message: string }[] }> {
      const resp = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
          "Accept": "application/json"
        },
        body: JSON.stringify({ query, variables })
      });

      if (!resp.ok) {
        const text = await resp.text();
        return {
          errors: [{ message: `HTTP ${resp.status} ${resp.statusText}: ${text}` }]
        };
      }

      return (await resp.json()) as {
        data?: TData;
        errors?: { message: string }[];
      };
    }
  };
}
