# Privacy Policy & Mandatory Shopify GDPR Compliance

**App Name:** TermsLock: B2B PO, Tax & Net-30 Checkout Rules
**App Identifier:** `com.evidencepair.shopify.termslock`
**Effective Date:** October 15, 2026
**Data Protection Contact:** `privacy@evidencepair.com`

---

## 1. Zero-PII Architecture (100% Shopify-Native Storage)

TermsLock is architected from the ground up for **Zero External PII Persistence**:

1. **Stateless WebAssembly Execution:**
   - Both `b2b-checkout-validator` (`purchase.validation.run`) and `b2b-payment-gate` (`purchase.payment-customization.run`) execute entirely inside Shopify's isolated, air-gapped WebAssembly runtime during checkout.
   - Checkout inputs (`cart.poNumber`, `cart.billingAddress`, `cart.buyerIdentity`, `cart.lines`) are evaluated in ephemeral Wasm memory (`< 5ms`) and immediately discarded.
   - Shopify Functions have **zero network access** and cannot transmit buyer data outside Shopify's infrastructure.

2. **App-Owned Metafield Configuration (`$app:termslock`):**
   - Merchant rule configurations (`rules_config` and `payment_rules`, strictly `< 10 KB` JSON) are stored exclusively inside Shopify's own database as App-Owned Metafields (`namespace: "$app:termslock"`).
   - No customer names, email addresses, billing addresses, phone numbers, or payment instruments are ever written to external databases or third-party servers.

---

## 2. Mandatory Shopify GDPR Compliance Webhooks (`2026-10`)

TermsLock subscribes to and verifies all three mandatory GDPR compliance webhooks configured in `shopify.app.toml` (`api_version = "2026-10"`, `uri = "/webhooks/gdpr"`) using timing-safe `X-Shopify-Hmac-Sha256` signature verification (`web/webhooks/gdpr-handlers.ts`):

| Webhook Topic | Handler Behavior | External PII Stored |
| :--- | :--- | :--- |
| `customers/data_request` | Verifies HMAC-SHA256 signature and returns `200 OK` confirming `0` customer PII records are stored outside Shopify (`piiStoredCount: 0`). | `0 records` |
| `customers/redact` | Verifies HMAC-SHA256 signature and returns `200 OK` confirming no external buyer records exist to redact (`piiStoredCount: 0`). | `0 records` |
| `shop/redact` | Verifies HMAC-SHA256 signature and confirms shop state cleanup. All `$app:termslock` App-Owned Metafields are automatically purged by Shopify upon app uninstallation. | `0 records` |

---

## 3. Access Scopes Justification

TermsLock requests the minimum required Shopify Admin OAuth scopes:
- `read_customers`: Used inside Shopify Functions input queries (`hasAnyTag`) to evaluate B2B/Net-30 customer tag eligibility at checkout.
- `read_products`: Used inside Shopify Functions input queries (`sku`, `product.hasAnyTag`) to evaluate Freight/Pallet, Case-Pack (`6x`/`12x`), and Hazmat SKU rules.
- `write_validations`: Required to register `b2b-checkout-validator` via `cartValidationCreate` and sync `$app:termslock.rules_config`.
- `write_payment_customizations`: Required to register `b2b-payment-gate` via `paymentCustomizationCreate` and sync `$app:termslock.payment_rules`.
