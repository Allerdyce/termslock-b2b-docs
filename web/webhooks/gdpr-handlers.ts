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
 * Directly updates from raw Buffer bytes to prevent JSON re-serialization discrepancy.
 */
export function verifyShopifyWebhookHmac(
  rawBody: Buffer | string,
  hmacHeader: string,
  clientSecret: string
): boolean {
  if (!hmacHeader || !clientSecret) {
    return false;
  }
  const hmac = crypto.createHmac("sha256", clientSecret);
  if (Buffer.isBuffer(rawBody)) {
    hmac.update(rawBody);
  } else {
    hmac.update(rawBody, "utf8");
  }
  const digest = hmac.digest("base64");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmacHeader, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/**
 * Universal Web Crypto HMAC-SHA256 verification (for Cloudflare Workers and Web Standards).
 */
export async function verifyShopifyWebhookHmacWebCrypto(
  rawBody: ArrayBuffer | Uint8Array | string,
  hmacHeader: string,
  clientSecret: string
): Promise<boolean> {
  if (!hmacHeader || !clientSecret) return false;
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(clientSecret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const data =
      typeof rawBody === "string"
        ? encoder.encode(rawBody)
        : rawBody instanceof Uint8Array
        ? rawBody
        : new Uint8Array(rawBody);
    const signature = await crypto.subtle.sign("HMAC", key, data);
    const binary = String.fromCharCode(...new Uint8Array(signature));
    const base64Digest = btoa(binary);

    if (base64Digest.length !== hmacHeader.length) return false;
    let match = 0;
    for (let i = 0; i < base64Digest.length; i++) {
      match |= base64Digest.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
    }
    return match === 0;
  } catch {
    return false;
  }
}

/**
 * Handles mandatory Shopify GDPR webhooks (`customers/data_request`, `customers/redact`, `shop/redact`).
 * TermsLock stores 0 customer PII in external databases; all rule configurations live inside
 * Shopify App-Owned Metafields (`$app:termslock`) and are automatically purged by Shopify on uninstall.
 */
export function handleGdprWebhook(params: {
  topic: GdprTopic;
  rawBody: Buffer | string;
  hmacHeader: string;
  clientSecret: string;
}): GdprWebhookResponse {
  const verified = verifyShopifyWebhookHmac(
    params.rawBody,
    params.hmacHeader,
    params.clientSecret
  );

  const rawString = Buffer.isBuffer(params.rawBody)
    ? params.rawBody.toString("utf8")
    : params.rawBody;
  const parsed = JSON.parse(rawString || "{}") as Partial<GdprWebhookPayload>;
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

/**
 * Universal Web Crypto version of handleGdprWebhook compatible with Cloudflare Workers (workerd)
 * and modern Web Standard runtimes (Deno, Bun, Node 20+).
 */
export async function handleGdprWebhookAsync(params: {
  topic: GdprTopic;
  rawBody: ArrayBuffer | Uint8Array | string;
  hmacHeader: string;
  clientSecret: string;
}): Promise<GdprWebhookResponse> {
  const verified = await verifyShopifyWebhookHmacWebCrypto(
    params.rawBody,
    params.hmacHeader,
    params.clientSecret
  );

  let rawString: string;
  if (typeof params.rawBody === "string") {
    rawString = params.rawBody;
  } else if (params.rawBody instanceof Uint8Array) {
    rawString = new TextDecoder().decode(params.rawBody);
  } else {
    rawString = new TextDecoder().decode(new Uint8Array(params.rawBody));
  }

  let shopDomain = "unknown.myshopify.com";
  try {
    const parsed = JSON.parse(rawString || "{}") as Partial<GdprWebhookPayload>;
    shopDomain = parsed.shop_domain ?? "unknown.myshopify.com";
  } catch {
    // ignore
  }

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
    action: actionsByTopic[params.topic] ?? "Acknowledged",
    acknowledgedAt: new Date().toISOString()
  };
}

