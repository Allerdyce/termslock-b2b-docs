# TermsLock Merchant User Guide

**Product:** TermsLock: B2B PO, Tax & Net-30 Checkout Rules (`com.evidencepair.shopify.termslock`)
**Target Shopify API Version:** `2026-10`

---

## 1. Quick Start (Under 3 Minutes)

1. **Install & Select Plan:**
   - Open **TermsLock** in your Shopify Admin and select either the **B2B Standard Plan** (`$39.00 / 30 days`) or the **Shopify Plus & Enterprise Wholesale Plan** (`$99.00 / 30 days`). Both plans include a **14-day free trial**.
2. **Enable the Two Native Shopify Functions:**
   - Click **Activate Checkout Rules** in the TermsLock dashboard.
   - TermsLock automatically invokes `cartValidationCreate` (`b2b-checkout-validator`) and `paymentCustomizationCreate` (`b2b-payment-gate`) and initializes your App-Owned Metafields (`$app:termslock.rules_config` and `$app:termslock.payment_rules`).
3. **Test in the Dry-Run Checkout Simulator:**
   - Before saving any change, enter a sample Cart Subtotal (e.g., `$1,250.00`), Customer Tag (`Net-30`), PO Number (`PO-10492`), and Billing Company in the right-hand **Dry-Run Checkout Simulator** to inspect exact inline checkout error messages and payment gateway visibility.

---

## 2. Configuring the 4 B2B Checkout Validation Gates

### Gate 1: PO Number Format & Requirement Gate (`$.cart.poNumber`)
- **When it triggers:**
  - Buyer is checking out under a Shopify B2B `purchasingCompany`, OR
  - Customer account has tag `B2B`, `Net-30`, `Wholesale`, or `Approved-Wholesale`, OR
  - Cart subtotal is greater than or equal to your configured threshold (default: `$1,000.00`).
- **What it validates:**
  - Ensures `cart.poNumber` is non-empty, meets your minimum character length (default `4`), and matches your regular expression (default `^PO-[0-9]{5,10}$`).
- **Checkout behavior:**
  - Displays an inline validation error directly beneath the native Shopify Checkout **PO Number** input (`target: "$.cart.poNumber"`).

### Gate 2: B2B Billing Address & Freight PO Box Blocker (`$.cart.billingAddress.*`)
- **Freight / Pallet PO Box Blocker (`$.cart.billingAddress.address1`):**
  - Automatically detects line items tagged `Freight` or `Pallet` (or SKU prefixes `FREIGHT-`, `PLT-`, `PALLET-`) and blocks checkout if `cart.billingAddress.address1` contains a PO Box (`P.O. Box`, `PO Box`, `Post Office Box`, `Postal Box`).
- **Corporate Entity & VAT/Tax ID Requirement (`$.cart.billingAddress.company`):**
  - Requires a non-empty legal company name on B2B orders.
  - Optional: Toggle **Require VAT/Tax ID in Company Field** to enforce a tax identifier pattern such as `(VAT|TAX|EIN|GST)-[A-Z0-9]{5,15}`.
- **Jurisdiction Completeness (`countryCode`, `provinceCode`, `zip`):**
  - Enforces allowed billing countries, required state/province codes (`US`, `CA`), and non-empty postal codes.

### Gate 3: Wholesale MOQ & Case-Pack Multiplier Gate (`$.cart`)
- **Minimum Order Subtotal (MOQ):**
  - Blocks B2B/wholesale checkouts below your configured subtotal floor (default `$500.00`).
- **Case-Pack Multipliers:**
  - Products tagged `Wholesale-Case-6` (or SKU prefix `CASE6-`) must be ordered in multiples of `6` (`6, 12, 18...`).
  - Products tagged `Wholesale-Case-12` (or SKU prefix `CASE12-`) must be ordered in multiples of `12` (`12, 24, 36...`).

### Gate 4: Hazmat / Restricted SKU Combination Gate (`$.cart`)
- Prevents incompatible hazardous materials (e.g., `Hazmat-Class-3` flammable liquids and `Hazmat-Oxidizer` or `Lithium-Bulk`) from being purchased in the same checkout order.

---

## 3. Configuring the Net-30 & Wholesale Payment Method Gate

### Locking Net-30 / Manual Invoice to Verified Buyers
- TermsLock scans checkout payment methods matching `Net-30`, `Net 30`, `Invoice`, `Manual Payment`, or `Purchase Order`.
- The gateway is **hidden** unless:
  1. The customer has the `Net-30` or `Approved-Wholesale` tag, **AND**
  2. The buyer entered a valid `cart.poNumber` matching your corporate PO regex.
- When unlocked, TermsLock renames the gateway to `"Net-30 Corporate Invoice (PO Verified)"` and moves it to position `#1` (`index: 0`).

### Protecting Margin on High-Value Orders (`$5,000+`)
- Automatically hides **Cash on Delivery (COD)** on B2B orders or carts above `$1,000.00`.
- Automatically hides high-fee credit card gateways (`Shopify Payments`, `Credit Card`, `Amex`) when the cart total reaches `$5,000.00+` or the customer is tagged `Wire-Only`, guiding wholesale buyers to ACH/Wire or Net-30 Invoice.
