# Shopify Functions 2026-10: Native `cart.poNumber` & `cart.billingAddress` Reference

**Target API Version:** `2026-10` (building on `2026-04` B2B Checkout Primitives)
**Extension Targets:**
- `purchase.validation.run` (`b2b-checkout-validator`)
- `purchase.payment-customization.run` (`b2b-payment-gate`)

---

## 1. Native B2B Fields in Shopify Functions (`2026-04` / `2026-10`)

Prior to Shopify API `2026-04`, checkout validation Functions could only inspect shipping `deliveryGroups` or generic cart `attribute` key-value pairs for Purchase Order numbers and billing addresses. Starting in `2026-04` and standardized in `2026-10`:

1. **`cart.poNumber: String`**
   - Exposes the native B2B Purchase Order number entered by the buyer in the Checkout PO Number field (`Cart.poNumber`).
   - Can be queried in both `purchase.validation.run` and `purchase.payment-customization.run`.
2. **`cart.billingAddress: MailingAddress`**
   - Exposes the structured billing address (`company`, `address1`, `address2`, `city`, `provinceCode`, `countryCode`, `zip`, `firstName`, `lastName`, `phone`) directly on the `Cart` object during checkout validation.

---

## 2. Field-Specific Validation Error Targets

When returning `FunctionError` items in `FunctionRunResult.errors`, `target` determines where Shopify Checkout renders the inline validation banner:

| Target JSONPath | UI Placement in Shopify Checkout | Primary B2B Use Case |
| :--- | :--- | :--- |
| `$.cart.poNumber` | Inline directly beneath the B2B Purchase Order Number input field | Missing PO number, PO number below minimum length, or failed corporate regex (e.g., `^PO-[0-9]{5,10}$`). |
| `$.cart.billingAddress.company` | Inline beneath the Billing Address Company field | Missing legal entity name or missing required VAT/EIN tax identifier prefix on wholesale orders. |
| `$.cart.billingAddress.address1` | Inline beneath the Billing Address Street Line 1 field | Blocking PO Box / Post Office Box addresses when cart contains `Freight` or `Pallet` items. |
| `$.cart.billingAddress.countryCode` | Inline beneath Billing Country selector | Restricting B2B invoicing to approved tax jurisdictions. |
| `$.cart.billingAddress.provinceCode` | Inline beneath Billing State/Province selector | Requiring valid state/province codes for nexus tax compliance. |
| `$.cart.billingAddress.zip` | Inline beneath Billing ZIP/Postal Code field | Requiring valid postal code format for B2B credit verification. |
| `$.cart` | Top-level Checkout Cart banner | Wholesale Minimum Order Subtotal (MOQ), case-pack quantity multiples (`6x` / `12x`), and incompatible Hazmat SKU combinations. |

---

## 3. Wasm Resource & Complexity Constraints

Shopify Functions execute inside a deterministic WebAssembly sandbox:

- **Input Query Complexity Limit (`< 30 points`):**
  - Shopify rejects Function deployment if `run.graphql` exceeds `30` complexity points.
  - **Cost Breakdown for `b2b-checkout-validator` (`19 points` total):**
    - `cart` (`1`) + `poNumber` (`1`) + `billingAddress` (`2`) + `cost.subtotalAmount` (`2`) + `buyerIdentity.customer.hasAnyTag` (`2`) + `buyerIdentity.purchasingCompany` (`3`) + `lines` (`3`) + `merchandise.ProductVariant.product.hasAnyTag` (`3`) + `cartValidation.metafield` (`2`) = **19 points**.
  - **Cost Breakdown for `b2b-payment-gate` (`11 points` total):**
    - `cart.cost.totalAmount` (`2`) + `cart.poNumber` (`1`) + `cart.buyerIdentity` (`3`) + `paymentMethods` (`3`) + `paymentCustomization.metafield` (`2`) = **11 points**.
- **Output Payload Limit (`< 20 KB` JSON):**
  - The serialized JSON returned to `STDOUT` must be strictly `< 20,480 bytes`.
  - TermsLock caps the maximum number of returned errors and truncates diagnostic strings to guarantee output stays under `4 KB` even in worst-case multi-line violations.
- **Zero External Network Calls:**
  - WASI sockets and HTTP clients are completely absent in the Shopify Functions runtime. All configuration must be read from `$app:termslock` metafields injected via `run.graphql`.
