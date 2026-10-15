# AGENTS.md — Operational Directives for TermsLock: B2B PO, Tax & Net-30 Checkout Rules

**App Identifier:** `com.evidencepair.shopify.termslock`
**Target Shopify API Version:** `2026-10`
**Repository Root:** `/Users/ali/termslock-shopify`
**Execution Mode:** 100% Headless, Deterministic, Zero-External-Network Functions

---

## 1. Architectural Mandate & Core Constraints

TermsLock is an embedded Shopify B2B governance application built around two deterministic Shopify Functions (WebAssembly/Javy targets) and an Embedded Admin Rule Builder + Dry-Run Simulator.

All agents and contributors modifying this repository must strictly enforce the following operational invariants:

1. **Shopify Functions Wasm Execution Limits:**
   - **GraphQL Input Complexity:** Every `run.graphql` query MUST remain strictly under **30 complexity points** (`< 30 points`). Avoid deeply nested connection edges or unbounded list queries. Use `hasAnyTag(tags: [...])` with bounded tag arrays rather than fetching raw tag lists.
   - **Function Output Size:** Every Function return payload (`FunctionRunResult`) MUST serialize to **`< 20 KB` JSON** (`< 20,480 bytes`). Error messages must be concise, actionable, and capped.
   - **Metafield Configuration Size:** Merchant rules stored in App-Owned Metafields (`namespace: "$app:termslock"`, `key: "rules_config"` for cart/checkout validation and `key: "payment_rules"` for payment customization) MUST compile to **`< 10 KB` JSON** (`< 10,240 bytes`) before calling `metafieldsSet`.
   - **Zero External Network Calls:** Shopify Functions execute inside a deterministic, air-gapped WebAssembly sandbox (`11M` instruction ceiling, `5ms` CPU budget). Functions MUST NEVER invoke `fetch`, `XMLHttpRequest`, timers, random number generators, or system clock APIs. All validation and payment customization decisions must be 100% pure functions of `(RunInput, MetafieldConfig)`.

2. **Shopify 2026-04 / 2026-10 Native B2B Field Targets:**
   - Use the native `cart.poNumber` and `cart.billingAddress` fields on the `Cart` GraphQL object introduced in `2026-04` and stabilized in `2026-10`.
   - Return field-specific inline checkout errors targeting:
     - `$.cart.poNumber`
     - `$.cart.billingAddress.company`
     - `$.cart.billingAddress.address1`
     - `$.cart.billingAddress.countryCode`
     - `$.cart.billingAddress.provinceCode`
     - `$.cart.billingAddress.zip`
     - `$.cart` (for cart-wide MOQ, case-pack multiplier, and incompatible hazmat SKU rules)

3. **100% Headless Build & Verification:**
   - Never invoke interactive `shopify app dev` or `shopify auth login` prompts during automated build/test pipelines.
   - All Function logic, Admin GraphQL compilers, Billing API gates, and Checkout Simulator pipelines must be testable offline via `npm test` (Vitest) and `npm run typecheck` (`tsc --noEmit`).

---

## 2. Repository Structure

```text
/Users/ali/termslock-shopify
├── AGENTS.md
├── SPEC.md
├── shopify.app.toml
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── docs/
│   ├── context/
│   │   ├── 01-shopify-functions-2026-10-po-billing.md
│   │   └── 02-metafield-config-billing-api.md
│   └── shopify-store/
│       ├── README.md
│       ├── USER_GUIDE.md
│       ├── PRIVACY_AND_GDPR.md
│       ├── FAQ.md
│       ├── SHOPIFY_LISTING_COPY.md
│       └── screenshots/
│           ├── app-icon-1200x1200.png
│           ├── 01-b2b-po-number-checkout-validation.png
│           ├── 02-net30-payment-method-customization.png
│           └── 03-wholesale-moq-dryrun-simulator.png
├── extensions/
│   ├── b2b-checkout-validator/
│   │   ├── shopify.extension.toml
│   │   ├── schema.graphql
│   │   ├── run.graphql
│   │   └── src/
│   │       ├── index.ts
│   │       ├── run.ts
│   │       └── types.ts
│   └── b2b-payment-gate/
│       ├── shopify.extension.toml
│       ├── schema.graphql
│       ├── run.graphql
│       └── src/
│           ├── index.ts
│           ├── run.ts
│           └── types.ts
├── web/
│   ├── compiler/
│   │   └── metafield-compiler.ts
│   ├── billing/
│   │   └── shopify-billing.ts
│   ├── admin/
│   │   └── graphql-mutations.ts
│   ├── simulator/
│   │   └── dry-run-simulator.ts
│   ├── webhooks/
│   │   └── gdpr-handlers.ts
│   └── ui/
│       └── rule-builder-app.ts
└── tests/
    ├── b2b-checkout-validator.test.ts
    ├── b2b-payment-gate.test.ts
    ├── metafield-compiler-billing.test.ts
    └── dry-run-simulator.test.ts
```

---

## 3. Verification Checklist Before Tagging

- [ ] `npm run typecheck` exits with `0` errors across `extensions/`, `web/`, and `tests/`.
- [ ] `npm test` runs 20+ deterministic unit and integration tests covering all 4 validation gates, payment customization rules, `<10 KB` metafield budget enforcement, `<20 KB` output enforcement, `<30` GraphQL query complexity check, and Shopify Billing API plan gating.
- [ ] All App Store images in `docs/shopify-store/screenshots/` are verified 24-bit RGB PNGs (`color_type = 2`, no alpha channel) at exact dimensions (`1200x1200` and `1600x900`).
