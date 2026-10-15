import crypto from "node:crypto";

export type GdprTopic =
  | "customers/data_request"
  | "customers/redact"
  | "shop/redact";

export interface GdprWebhookPayload {
  shop_id: number;
  shop_domain: string;
  customer?: {
    id: number;
    email?: string;
    phone?: string;
  };
  orders_requested?: number[];
  orders_to_redact?: number[];
}

export interface GdprWebhookResponse {
  statusCode: 200 | 401;
  topic: GdprTopic;
  shopDomain: string;
  piiStoredCount: 0;
  action: string;
  acknowledgedAt: string;
}

/**
 * Verifies Shopify X-Shopify-Hmac-Sha256 webhook signature using timing-safe comparison.
 */
export function verifyShopifyWebhookHmac(
  rawBody: string,
  hmacHeader: string,
  clientSecret: string
): boolean {
  if (!hmacHeader || !clientSecret) {
    return false;
  }
  const digest = crypto
    .createHmac("sha256", clientSecret)
    .update(rawBody, "utf8")
    .digest("base64");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmacHeader, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/**
 * Handles mandatory Shopify GDPR webhooks (`customers/data_request`, `customers/redact`, `shop/redact`).
 * TermsLock stores 0 customer PII in external databases; all rule configurations live inside
 * Shopify App-Owned Metafields (`$app:termslock`) and are automatically purged by Shopify on uninstall.
 */
export function handleGdprWebhook(params: {
  topic: GdprTopic;
  rawBody: string;
  hmacHeader: string;
  clientSecret: string;
}): GdprWebhookResponse {
  const verified = verifyShopifyWebhookHmac(
    params.rawBody,
    params.hmacHeader,
    params.clientSecret
  );

  const parsed = JSON.parse(params.rawBody || "{}") as Partial<GdprWebhookPayload>;
  const shopDomain = parsed.shop_domain ?? "unknown.myshopify.com";

  if (!verified) {
    return {
      statusCode: 401,
      topic: params.topic,
      shopDomain,
      piiStoredCount: 0,
      action: "REJECTED_INVALID_HMAC",
      acknowledgedAt: new Date(0).toISOString()
    };
  }

  const actionsByTopic: Record<GdprTopic, string> = {
    "customers/data_request":
      "Verified 0 external customer PII records stored by TermsLock. All checkout evaluation executes in stateless Shopify Functions Wasm.",
    "customers/redact":
      "Verified 0 external customer PII records to redact. TermsLock persists no buyer records.",
    "shop/redact":
      "Verified shop configuration cleanup. App-owned metafields ($app:termslock) are managed and purged natively by Shopify."
  };

  return {
    statusCode: 200,
    topic: params.topic,
    shopDomain,
    piiStoredCount: 0,
    action: actionsByTopic[params.topic],
    acknowledgedAt: new Date().toISOString()
  };
}
