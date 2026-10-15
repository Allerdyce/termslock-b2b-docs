# Frequently Asked Questions (FAQ) — TermsLock B2B

---

### Q1: How does TermsLock validate the native B2B PO Number field in Shopify Checkout?
Starting in Shopify API `2026-04` and stabilized in `2026-10`, Shopify exposes `cart.poNumber` and `cart.billingAddress` directly inside the Cart & Checkout Validation Function input graph (`purchase.validation.run`). TermsLock evaluates your regular expression (e.g., `^PO-[0-9]{5,10}$`) against `cart.poNumber` and returns inline validation errors directly targeting `$.cart.poNumber`.

---

### Q2: Can TermsLock block PO Boxes only when an order contains Freight or Pallet items?
Yes. Gate 2 inspects cart lines for products tagged `Freight` or `Pallet` (or SKU prefixes `FREIGHT-`, `PLT-`, `PALLET-`). When present, if `cart.billingAddress.address1` matches a PO Box pattern (`P.O. Box`, `PO Box`, `Post Office Box`, `Postal Box`), TermsLock blocks checkout and displays an inline error right below the street address field (`$.cart.billingAddress.address1`).

---

### Q3: How does the Net-30 Payment Method Gate prevent unauthorized buyers from choosing "Invoice / Net-30"?
TermsLock's second Shopify Function (`b2b-payment-gate`, targeting `purchase.payment-customization.run`) inspects both the buyer's customer tags (`Net-30` or `Approved-Wholesale`) and `cart.poNumber`. If either is missing or invalid, TermsLock hides the Net-30 / Manual Invoice payment method. When both are verified, TermsLock unlocks the gateway, renames it to `"Net-30 Corporate Invoice (PO Verified)"`, and moves it to position `#1`.

---

### Q4: Will TermsLock slow down our checkout or fail if an external server goes down?
Never. TermsLock executes 100% inside Shopify's edge WebAssembly sandbox (`< 1ms` runtime) with **zero external network calls**. Your rule configuration is stored directly inside Shopify's App-Owned Metafields (`$app:termslock`, strictly `< 10 KB` JSON), guaranteeing 100% uptime even during Flash Sales or BFCM peak traffic.

---

### Q5: What is the difference between the $39 B2B Standard Plan and the $99 Shopify Plus & Enterprise Plan?
- **B2B Standard Plan (`$39.00 / 30 days`, 14-day free trial):** Includes PO Number Regex & Threshold Validation (`$.cart.poNumber`), Freight PO Box Blocker & Billing Company Validation (`$.cart.billingAddress.*`), and Wholesale MOQ + `6x`/`12x` Case-Pack Multipliers (`$.cart`).
- **Shopify Plus & Enterprise Wholesale Plan (`$99.00 / 30 days`, 14-day free trial):** Includes all Standard features plus the **Net-30 & High-Value Payment Method Gate**, **Hazmat Incompatible SKU Matrix**, Unlimited B2B Rule Profiles, and Priority Engineering Support.

---

### Q6: Can I test my regex and MOQ rules before enabling them on live traffic?
Yes! TermsLock includes a built-in **Dry-Run Checkout Simulator** inside the Embedded Admin dashboard. Enter any sample Cart Subtotal, Customer Tag, PO Number, Billing Company, and SKU quantity to preview exact `$.cart.poNumber` / `$.cart.billingAddress.*` / `$.cart` validation errors and hidden payment methods in real time.
