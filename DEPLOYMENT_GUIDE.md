# TermsLock: B2B PO, Tax & Net-30 Checkout Rules
## Production Cloud Deployment & Shopify App Store Release Guide

**App Identifier:** `com.evidencepair.shopify.termslock`  
**Target Shopify API Version:** `2026-10`  
**Execution Sandbox:** Air-gapped WebAssembly (Javy Wasm target) + Shopify Admin Embedded UI

---

## 1. Cloud Infrastructure Overview

TermsLock consists of two distinct production components:
1. **Wasm Functions (Serverless & Air-Gapped):** Compiled into WebAssembly (`termslock-checkout-validator` and `termslock-payment-gate`) hosted directly on Shopify's global edge infrastructure with zero external network latency.
2. **Admin Rule Builder & Simulator Service:** Node.js HTTP server (`src/server.ts`) providing App Bridge v4 embedded rule configuration, Managed Installation Token Exchange (OAuth 2.0 RFC 8693), and mandatory GDPR compliance webhooks. Deployable to Render, Fly.io, Railway, or AWS.

---

## 2. 5-Command Turnkey Deployment Checklist

Follow these exact 5 steps to take TermsLock from local code to a live production installation:

### Step 1: Deploy the Admin HTTP Server to Cloud (Render / Fly.io / Railway)
Deploy the containerized server using the provided `Dockerfile` or `fly.toml` / `render.yaml`:

```bash
# Example: Deploying to Fly.io
fly launch --config fly.toml --copy-config --yes
fly deploy

# Example: Deploying to Render
# Connect your GitHub repo to Render and select "New Web Service" referencing render.yaml
```

Set the following environment variables in your cloud provider dashboard:
- `SHOPIFY_API_KEY`: Your Shopify App Client ID from Partners Dashboard.
- `SHOPIFY_API_SECRET`: Your Shopify App Client Secret.
- `SCOPES`: `write_cart_validations,write_payment_customizations`
- `PORT`: `3456`

Note your live public URL: `https://termslock-app.fly.dev` (or `https://termslock-shopify.onrender.com`).

---

### Step 2: Link Local Repository to Shopify Partner App
Connect the local workspace to your app configuration in Shopify Partners:

```bash
npx @shopify/cli@latest app config link
```

Select your Partner organization and choose `TermsLock: B2B PO, Tax & Net-30 Checkout Rules`. This pulls your partner IDs into `shopify.app.toml`.

---

### Step 3: Update Production URLs in `shopify.app.toml`
Update your production URLs to point to your live hosted service:

```bash
# Set your application URL and redirect paths
npx @shopify/cli@latest app config use
```

Verify in `shopify.app.toml` (Include `[auth] redirect_urls = [ 'https://.../api/auth/callback' ]`, `[pos] embedded = false`, `compliance_topics = [ 'customers/data_request', 'customers/redact', 'shop/redact' ]`, and `app/uninstalled` webhook subscription in `shopify.app.toml`, verifying HMAC-SHA256 strictly against the raw HTTP request buffer):
```toml
client_id = "YOUR_SHOPIFY_API_KEY"
application_url = "https://termslock-app.fly.dev"
embedded = true
api_version = "2026-10"

[pos]
embedded = false

[auth]
redirect_urls = [
  "https://termslock-app.fly.dev/api/auth/callback"
]

[webhooks]
api_version = "2026-10"

  [[webhooks.subscriptions]]
  compliance_topics = ["customers/data_request", "customers/redact", "shop/redact"]
  uri = "https://termslock-app.fly.dev/api/webhooks/gdpr"

  [[webhooks.subscriptions]]
  topics = ["app/uninstalled"]
  uri = "https://termslock-app.fly.dev/api/webhooks/uninstalled"
```

---

### Step 4: Deploy WebAssembly Functions to Shopify Edge
Compile and deploy the deterministic Wasm extensions to Shopify:

```bash
npx @shopify/cli@latest app deploy
```

This compiles `extensions/b2b-checkout-validator` and `extensions/b2b-payment-gate` using Javy into Wasm modules and uploads them to Shopify's global Functions registry.

---

### Step 5: Install & Test on a B2B Development Store
Open your B2B development store (with Shopify Plus / B2B features enabled):

```bash
# Generate the installation URL
npx @shopify/cli@latest app open
```

1. Install TermsLock on your store.
2. In Shopify Admin, navigate to **Apps > TermsLock B2B Rules**.
3. Configure your PO regex (`^PO-[0-9]{6}$`), wholesale MOQ (`$500`), and Net-30 customer tags (`Net-30`).
4. Click **Save rules** to compile the rules into `$app:termslock` metafields.
5. In Storefront Checkout, verify:
   - Untagged retail customers or non-PO orders block Net-30 invoice terms.
   - PO numbers failing the regex trigger field-level inline errors on `cart.poNumber`.
   - Freight line items going to a P.O. Box trigger blocking errors on `cart.billingAddress.address1`.
   - Verified B2B orders unlock and promote Net-30 corporate invoices to the top of payment options.

---

## 3. Production OAuth & Token Exchange Specification

TermsLock uses Shopify's Managed Installation Token Exchange (RFC 8693) so that App Bridge session tokens are seamlessly exchanged for offline access tokens:

```http
POST https://{shop}/admin/oauth/access_token
Content-Type: application/json

{
  "client_id": "SHOPIFY_API_KEY",
  "client_secret": "SHOPIFY_API_SECRET",
  "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
  "subject_token": "ID_TOKEN_FROM_APP_BRIDGE",
  "subject_token_type": "urn:ietf:params:oauth:token-type:id_token",
  "requested_token_type": "urn:shopify:params:oauth:token-type:offline-access-token"
}
```

The server caches the access token in memory by shop domain and dispatches GraphQL mutations (`cartValidationCreate`, `paymentCustomizationCreate`, and `metafieldsSet`) directly to `https://{shop}/admin/api/2026-10/graphql.json`.
