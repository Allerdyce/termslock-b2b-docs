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

// In-memory token cache keyed by normalized shop domain
const tokenCache = new Map<string, { accessToken: string; scope?: string; cachedAt: number }>();

export function clearTokenCache(): void {
  tokenCache.clear();
}

export function getCachedAccessToken(shop: string): string | undefined {
  const normalized = shop.toLowerCase().trim();
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
  const clientId =
    params.clientId ??
    process.env.SHOPIFY_API_KEY ??
    "termslock_mock_client_id_2026";
  const clientSecret =
    params.clientSecret ??
    process.env.SHOPIFY_API_SECRET ??
    "termslock_mock_secret_2026";
  const fetchFn = params.fetchFn ?? fetch;

  // Check cache first
  const existing = tokenCache.get(shop);
  if (existing) {
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
    cachedAt: Date.now()
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
  const endpoint = `https://${shop}/admin/api/${apiVersion}/graphql.json`;

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
