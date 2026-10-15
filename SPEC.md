# SPEC.md — Technical Specification: TermsLock (`com.evidencepair.shopify.termslock`)

**Product Name:** TermsLock: B2B PO, Tax & Net-30 Checkout Rules
**App ID:** `com.evidencepair.shopify.termslock`
**Shopify API Version:** `2026-10`
**Extension Targets:**
1. `purchase.validation.run` (`extensions/b2b-checkout-validator`)
2. `purchase.payment-customization.run` (`extensions/b2b-payment-gate`)

---

## 1. Executive Summary

B2B and wholesale merchants on Shopify frequently suffer from invalid or missing Purchase Order (PO) numbers, unshippable PO Box addresses on freight/pallet SKUs, missing billing company or VAT/Tax identifiers, violated wholesale Minimum Order Quantities (MOQs) or case-pack multiples, incompatible hazmat items, and unauthorized buyers selecting "Net-30 / Invoice" payment terms at checkout.

**TermsLock** enforces deterministic, zero-latency checkout rules using Shopify Functions (`2026-10`), leveraging native `cart.poNumber` and `cart.billingAddress` GraphQL input fields and field-specific validation error targets (`$.cart.poNumber`, `$.cart.billingAddress.*`, and `$.cart`). All merchant rules are stored in App-Owned Metafields (`$app:termslock`) under a strict `< 10 KB` JSON payload ceiling, guaranteeing zero external network dependency and 100% checkout uptime.

---

## 2. Function Extension #1: B2B Cart, PO Number & Billing Address Validator (`extensions/b2b-checkout-validator`)

### 2.1 GraphQL Input Query (`run.graphql`)
Queries:
- `cart.poNumber`
- `cart.billingAddress { company address1 city provinceCode countryCode zip }`
- `cart.cost.subtotalAmount.amount`
- `cart.buyerIdentity { customer { hasAnyTag(tags: ["B2B", "Net-30", "Wholesale", "Approved-Wholesale", "Tax-Exempt"]) numberOfOrders } purchasingCompany { company { id name } location { id } } }`
- `cart.lines { quantity merchandise { ... on ProductVariant { id sku product { hasAnyTag(tags: ["Freight", "Pallet", "Wholesale-Case-6", "Wholesale-Case-12", "Hazmat-Class-3", "Hazmat-Oxidizer", "Lithium-Bulk"]) } } } }`
- `cartValidation { metafield(namespace: "$app:termslock", key: "rules_config") { value } }`

**Complexity Budget:** `19 points` (`< 30` maximum allowed by Shopify Functions).

### 2.2 The 4 Deterministic Validation Gates (`src/run.ts`)

1. **Gate 1 — PO Number Format & Requirement Gate (`$.cart.poNumber`):**
   - Triggered when ANY of the following holds:
     - `cart.buyerIdentity.purchasingCompany` is non-null (Shopify B2B company profile active), OR
     - `cart.buyerIdentity.customer` matches configured B2B tags (`B2B`, `Net-30`, `Wholesale`, `Approved-Wholesale`), OR
     - `cart.cost.subtotalAmount.amount >= poRule.subtotalThreshold` (default: `$1,000.00`).
   - Enforces:
     - Non-empty `cart.poNumber` (trimmed length `>= poRule.minLength`, default `4`).
     - Matches merchant-configured regex pattern (default `^PO-[0-9]{5,10}$`).
   - Error Target: `$.cart.poNumber`.

2. **Gate 2 — B2B Billing Address & Tax/Company Gate (`$.cart.billingAddress.*`):**
   - **PO Box Blocker on Freight/Pallet Items (`$.cart.billingAddress.address1`):**
     - When any cart line has product tag `Freight` or `Pallet` (or SKU prefix matching `FREIGHT-` / `PLT-`), checks `cart.billingAddress.address1` against a comprehensive PO Box regex (`/\b(?:p\.?\s*o\.?\s*box|post\s+office\s+box|postal\s+box)\b/i`).
     - If matched, returns an inline error targeting `$.cart.billingAddress.address1`.
   - **Wholesale Company & VAT/Tax ID Requirement (`$.cart.billingAddress.company`):**
     - When order is wholesale/B2B, requires `cart.billingAddress.company` to be present and non-empty.
     - If `billingRule.requireTaxIdInCompany` is enabled (or when country requires VAT/EIN prefix), validates that `cart.billingAddress.company` contains a valid Tax/VAT identifier or meets corporate format rules.
     - Returns an inline error targeting `$.cart.billingAddress.company`.
   - **Jurisdiction / Postal Completeness Gate (`$.cart.billingAddress.countryCode`, `$.cart.billingAddress.provinceCode`, `$.cart.billingAddress.zip`):**
     - Optionally validates allowed billing countries, required province/state code for US/CA B2B orders, and non-empty postal/ZIP code.

3. **Gate 3 — Wholesale MOQ & Case-Pack Multiplier Gate (`$.cart`):**
   - **Minimum Order Subtotal:** When buyer is B2B/Wholesale, requires `cart.cost.subtotalAmount.amount >= moqRule.minimumSubtotal` (default `$500.00`).
   - **Case-Pack Line-Item Multiples:**
     - Products tagged `Wholesale-Case-6` must have `line.quantity % 6 === 0`.
     - Products tagged `Wholesale-Case-12` must have `line.quantity % 12 === 0`.
     - Custom SKU or tag multipliers configured in `moqRule.casePackMultipliers` are also evaluated.
   - Error Target: `$.cart`.

4. **Gate 4 — Hazmat / Restricted SKU Combination Gate (`$.cart`):**
   - Prevents incompatible hazardous or restricted product groups from being checked out in the same order (e.g., `Hazmat-Class-3` flammable liquids combined with `Hazmat-Oxidizer` or `Lithium-Bulk`).
   - Error Target: `$.cart`.

---

## 3. Function Extension #2: Net-30 & Wholesale Payment Method Gate (`extensions/b2b-payment-gate`)

### 3.1 GraphQL Input Query (`run.graphql`)
Queries:
- `cart.cost.totalAmount.amount`
- `cart.poNumber`
- `cart.buyerIdentity { customer { hasAnyTag(tags: ["Net-30", "Approved-Wholesale", "B2B", "Wire-Only"]) } purchasingCompany { company { id } } }`
- `paymentMethods { id name }`
- `paymentCustomization { metafield(namespace: "$app:termslock", key: "payment_rules") { value } }`

**Complexity Budget:** `11 points` (`< 30` maximum).

### 3.2 Payment Method Customization Logic (`src/run.ts`)

1. **Net-30 / Invoice / Manual Payment Locking:**
   - Identifies invoice/manual payment methods matching configured keywords (`["Net-30", "Net 30", "Invoice", "Manual Payment", "Purchase Order"]`).
   - Hides those methods UNLESS:
     - The buyer has an authorized tag (`Net-30` or `Approved-Wholesale`), AND
     - `cart.poNumber` is present, non-empty, and matches the configured PO regex (`^PO-[0-9]{5,10}$`).
   - When authorized, optionally renames or reorders the Net-30 method to index `0` (e.g., `"Net-30 Corporate Invoice (PO Verified)"`).

2. **COD & High-Fee Card Gateway Hiding on High-Value / B2B Orders:**
   - Hides Cash on Delivery (`"Cash on Delivery"`, `"COD"`) when B2B terms apply or `cart.cost.totalAmount.amount >= paymentConfig.hideCodThreshold` (default `$1,000.00`).
   - Hides high-fee credit card gateways (e.g., `"Credit Card"`, `"Shopify Payments"`, `"Bogus Gateway"`, `"Amex"`) when `cart.cost.totalAmount.amount >= paymentConfig.wireOnlyThreshold` (default `$5,000.00`) or when customer has the `"Wire-Only"` tag.

---

## 4. Embedded Admin UI, Metafield Sync & Shopify Billing API (`web/`)

### 4.1 Metafield Compiler & Admin Mutations
- Compiles UI rule state into compact, minified JSON schemas (`RulesConfigPayload` for `$app:termslock.rules_config` and `PaymentRulesPayload` for `$app:termslock.payment_rules`).
- Enforces strict `< 10,240 bytes` (`10 KB`) validation prior to building `metafieldsSet`, `cartValidationCreate`, and `paymentCustomizationCreate` GraphQL mutations targeting `2026-10`.

### 4.2 Shopify Billing API (`appSubscriptionCreate`)
- **B2B Standard Plan (`B2B_STANDARD`):** `$39.00 USD` every 30 days (`EVERY_30_DAYS`), 14-day free trial (`trialDays: 14`). Includes PO Number Validation, PO Box Blocking, and Wholesale MOQ Rules.
- **Shopify Plus & Enterprise Wholesale Plan (`PLUS_ENTERPRISE`):** `$99.00 USD` every 30 days (`EVERY_30_DAYS`), 14-day free trial (`trialDays: 14`). Includes all Standard features plus Net-30 Payment Method Gate, Hazmat SKU Matrix, and Unlimited Rule Profiles.
- Supports `DEV_BYPASS_BILLING=true` environment flag for seamless development store testing.

### 4.3 Interactive Dry-Run Checkout Simulator
- Executes both `runCheckoutValidation` and `runPaymentGate` directly against merchant rule configurations and synthetic checkout state (Cart Subtotal, Customer Tags, Purchasing Company, PO Number, Billing Address, Line Items, and Available Payment Gateways).
- Displays real-time field-targeted validation errors (`$.cart.poNumber`, `$.cart.billingAddress.company`, `$.cart.billingAddress.address1`, `$.cart`), hidden/visible payment gateways, and exact byte/complexity telemetry.
