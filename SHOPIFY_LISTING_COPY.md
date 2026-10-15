# Shopify App Store Listing Copy — TermsLock: B2B PO, Tax & Net-30 Checkout Rules

**App Name:** TermsLock: B2B PO, Tax & Net-30 Checkout Rules
**App Handle:** `termslock-b2b-checkout-rules`
**App Package ID:** `com.evidencepair.shopify.termslock`
**API Version:** `2026-10`
**Category:** Checkout > Checkout validation & Payment customization

---

## 1. Tagline (100 Characters Max)
Enforce B2B PO numbers, block freight PO Boxes, validate MOQs & lock Net-30 invoice payment terms.

---

## 2. Short Description (Introduction)
Stop chasing missing Purchase Order numbers, eating 2.9% credit card fees on $5,000+ wire orders, or dealing with carrier returns from PO Box addresses on LTL pallet shipments. **TermsLock** uses native Shopify Functions (`2026-10`) to validate `cart.poNumber` and `cart.billingAddress` inline at checkout and dynamically lock `Net-30 / Invoice` gateways to verified wholesale buyers—all in `<1ms` with zero external servers.

---

## 3. Key Feature Highlights

1. **Native `$.cart.poNumber` Format & Threshold Gate:**
   - Require valid Purchase Order numbers matching your corporate regex (e.g., `^PO-[0-9]{5,10}$`) whenever a B2B `purchasingCompany` is active, a customer holds a `B2B` / `Net-30` tag, or cart subtotal exceeds `$1,000.00`.
   - Displays clear inline errors directly under the native Shopify Checkout PO Number field (`$.cart.poNumber`).

2. **Freight PO Box Blocker & Corporate Billing Gate (`$.cart.billingAddress.*`):**
   - Automatically block PO Box addresses (`$.cart.billingAddress.address1`) when the cart contains `Freight` or `Pallet` SKUs.
   - Require a registered legal company name (`$.cart.billingAddress.company`) and optional VAT/EIN tax identifier prefix on wholesale orders.

3. **Net-30 & High-Value Payment Method Gate (`purchase.payment-customization.run`):**
   - Hide `Net-30`, `Invoice`, and `Manual Payment` options unless the buyer has the `Net-30` / `Approved-Wholesale` tag **AND** a valid `cart.poNumber`.
   - Hide Cash on Delivery (`COD`) on B2B orders and hide high-fee credit card gateways when cart total reaches `$5,000.00+`.

4. **Wholesale MOQ, Case-Pack Multipliers & Live Dry-Run Simulator:**
   - Enforce minimum wholesale order subtotals (`$500.00` MOQ), `6x`/`12x` case-pack quantity multiples, and Hazmat SKU compatibility rules.
   - Preview exact validation errors and hidden payment methods in real time with the built-in **Dry-Run Checkout Simulator**.

---

## 4. Pricing Tiers (`appSubscriptionCreate`)

- **B2B Standard Plan — `$39.00 / every 30 days` (14-Day Free Trial):**
  - Native `$.cart.poNumber` Regex & Threshold Validation
  - Freight & Pallet PO Box Blocker (`$.cart.billingAddress.address1`)
  - Corporate Billing Company Requirement (`$.cart.billingAddress.company`)
  - Wholesale MOQ Subtotal & `6x`/`12x` Case-Pack Multipliers
  - Live Dry-Run Checkout Simulator

- **Shopify Plus & Enterprise Wholesale Plan — `$99.00 / every 30 days` (14-Day Free Trial):**
  - Everything in B2B Standard Plan
  - Net-30 & Manual Invoice Payment Method Gate (Lock by Tag + Valid PO)
  - High-Value `$5,000+` Credit Card & COD Gateway Shield
  - Hazmat Incompatible SKU Matrix
  - Unlimited Rule Profiles & Priority Engineering Support

---

## 5. App Store Assets Checklist (Flattened 24-Bit RGB PNG, No Alpha)

- `docs/shopify-store/screenshots/app-icon-1200x1200.png` (`1200×1200px`, 24-bit RGB)
- `docs/shopify-store/screenshots/01-b2b-po-number-checkout-validation.png` (`1600×900px`, 24-bit RGB)
- `docs/shopify-store/screenshots/02-net30-payment-method-customization.png` (`1600×900px`, 24-bit RGB)
- `docs/shopify-store/screenshots/03-wholesale-moq-dryrun-simulator.png` (`1600×900px`, 24-bit RGB)
