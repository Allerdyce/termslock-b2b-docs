# App-Owned Metafield Configuration (`< 10 KB`) & Shopify Billing API (`2026-10`)

**App Identifier:** `com.evidencepair.shopify.termslock`
**Metafield Namespace:** `$app:termslock`
**Metafield Keys:**
- `rules_config` (attached to `CartValidation` owner ID)
- `payment_rules` (attached to `PaymentCustomization` owner ID)

---

## 1. App-Owned Metafield Architecture (`$app:termslock`)

Shopify Functions read their dynamic rule configurations from App-Owned Metafields (`namespace: "$app:termslock"`). Because metafield values are injected directly into the Function's `STDIN` JSON payload on every checkout invocation, keeping the metafield value compact is essential for staying below the `11M` Wasm instruction ceiling.

### 1.1 `< 10 KB` Rule Configuration Budget
- TermsLock enforces a hard maximum of **`10,240 bytes` (`10 KB` UTF-8)** for both `rules_config` and `payment_rules`.
- Before calling `metafieldsSet`, `compileRulesConfigToJson()` and `compilePaymentRulesToJson()` validate:
  1. Valid regex syntax on all merchant PO/Tax patterns (preventing ReDoS or runtime RegExp exceptions inside Wasm).
  2. Minified JSON serialization without whitespace.
  3. Exact UTF-8 byte length calculation (`Buffer.byteLength(json, 'utf8') < 10240`). If exceeded, a deterministic `MetafieldBudgetExceededError` is thrown before mutation execution.

### 1.2 Admin GraphQL Mutations (`2026-10`)
1. **`cartValidationCreate`**
   - Registers the `b2b-checkout-validator` Function and initializes its `$app:termslock` / `rules_config` metafield.
2. **`paymentCustomizationCreate`**
   - Registers the `b2b-payment-gate` Function and initializes its `$app:termslock` / `payment_rules` metafield.
3. **`metafieldsSet`**
   - Updates `namespace: "$app:termslock"`, `key: "rules_config"` or `"payment_rules"`, `type: "json"` on the active `CartValidation` or `PaymentCustomization` owner GID.

---

## 2. Shopify GraphQL Billing API (`appSubscriptionCreate`)

TermsLock monetizes via recurring 30-day subscriptions using Shopify's GraphQL Admin API (`appSubscriptionCreate`) with a **14-day free trial**:

| Plan Key | Plan Name | Price | Interval | Trial Days | Included Capabilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `B2B_STANDARD` | **B2B Standard Plan** | `$39.00 USD` | `EVERY_30_DAYS` | `14` | PO Number Regex & Threshold Gate, PO Box Freight Blocker, Billing Company Requirement, Wholesale MOQ & Case-Pack Multipliers. |
| `PLUS_ENTERPRISE` | **Shopify Plus & Enterprise Wholesale Plan** | `$99.00 USD` | `EVERY_30_DAYS` | `14` | Everything in Standard + Net-30 & COD Payment Method Gate, Hazmat Incompatible SKU Matrix, Unlimited B2B Rule Profiles, Priority Support. |

### 2.1 Development Store Bypass (`DEV_BYPASS_BILLING`)
- When `process.env.DEV_BYPASS_BILLING === "true"`, the billing gate returns an active synthetic `PLUS_ENTERPRISE` subscription state (`bypassed: true`), allowing partner development stores and automated CI tests to exercise all enterprise rules without triggering interactive billing redirects.
