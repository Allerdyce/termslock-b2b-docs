import { DEFAULT_RULES_CONFIG } from "../../extensions/b2b-checkout-validator/src/run.ts";
import type { TermsLockRulesConfig } from "../../extensions/b2b-checkout-validator/src/types.ts";
import { DEFAULT_PAYMENT_RULES_CONFIG } from "../../extensions/b2b-payment-gate/src/run.ts";
import type { TermsLockPaymentRulesConfig } from "../../extensions/b2b-payment-gate/src/types.js";
import {
  TERMSLOCK_BILLING_PLANS,
  type BillingPlanTier
} from "../billing/shopify-billing.ts";
import {
  compilePaymentRulesMetafield,
  compileValidationRulesMetafield
} from "../compiler/metafield-compiler.ts";
import {
  executeDryRunSimulation,
  type DryRunSimulatorScenario
} from "../simulator/dry-run-simulator.ts";

export interface EmbeddedAdminViewModel {
  activePlan: BillingPlanTier;
  validationRules: TermsLockRulesConfig;
  paymentRules: TermsLockPaymentRulesConfig;
  simulatorScenario: DryRunSimulatorScenario;
}

export const DEFAULT_SIMULATOR_SCENARIO: DryRunSimulatorScenario = {
  cartSubtotal: 1250.0,
  customerTags: ["Net-30"],
  purchasingCompanyName: "Apex Industrial Supply LLC",
  poNumber: "PO-10492",
  billingCompany: "Apex Industrial Supply LLC",
  billingAddress1: "400 Market St",
  billingCountryCode: "US",
  billingProvinceCode: "TX",
  billingZip: "78701",
  lineItems: [
    {
      sku: "FREIGHT-CASE6-200",
      quantity: 12,
      productTags: ["Freight", "Wholesale-Case-6"]
    }
  ]
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders the authentic Shopify Polaris v13 Merchant Rule Builder & Live B2B Checkout Preview.
 * Keeps all developer telemetry & raw Metafield JSON tucked inside a collapsed bottom <details> drawer.
 */
export function renderEmbeddedRuleBuilderHtml(
  state: Partial<EmbeddedAdminViewModel> = {}
): string {
  const activePlan = state.activePlan ?? "PLUS_ENTERPRISE";
  const validationRules = state.validationRules ?? DEFAULT_RULES_CONFIG;
  const paymentRules = state.paymentRules ?? DEFAULT_PAYMENT_RULES_CONFIG;
  const simulatorScenario =
    state.simulatorScenario ?? DEFAULT_SIMULATOR_SCENARIO;

  const compiledVal = compileValidationRulesMetafield(validationRules);
  const compiledPay = compilePaymentRulesMetafield(paymentRules);

  const simulation = executeDryRunSimulation(
    simulatorScenario,
    validationRules,
    paymentRules
  );

  const planSpec = TERMSLOCK_BILLING_PLANS[activePlan];

  const poError = simulation.validationErrors.find(
    (e) => e.target === "$.cart.poNumber"
  );
  const addressError = simulation.validationErrors.find((e) =>
    e.target.startsWith("$.cart.billingAddress")
  );
  const cartErrors = simulation.validationErrors.filter(
    (e) => e.target === "$.cart"
  );

  const sortedPreview = [...simulation.paymentMethodsPreview].sort((a, b) => {
    if (a.promotedToTop && !b.promotedToTop) return -1;
    if (!a.promotedToTop && b.promotedToTop) return 1;
    if (a.visible && !b.visible) return -1;
    if (!a.visible && b.visible) return 1;
    return 0;
  });

  const visibleMethods = sortedPreview.filter((pm) => pm.visible);
  const hiddenMethods = sortedPreview.filter((pm) => !pm.visible);

  const visibleRadioRowsHtml = visibleMethods
    .map((pm, idx) => {
      const isSelected = idx === 0;
      const badgeHtml = pm.promotedToTop
        ? `<span class="checkout-badge checkout-badge--promoted">Promoted to Default • Rank #1</span>`
        : `<span class="checkout-badge checkout-badge--standard">Available</span>`;
      return `<li class="checkout-radio-row ${isSelected ? "checkout-radio-row--selected" : ""}" data-method-id="${escapeHtml(pm.id)}">
        <div class="radio-left">
          <span class="radio-circle ${isSelected ? "radio-circle--checked" : ""}"></span>
          <span class="payment-name">${escapeHtml(pm.displayName)}</span>
        </div>
        ${badgeHtml}
      </li>`;
    })
    .join("\n");

  const hiddenRowsHtml = hiddenMethods
    .map(
      (pm) =>
        `<li class="checkout-hidden-row" data-method-id="${escapeHtml(pm.id)}">
          <span class="payment-name">${escapeHtml(pm.displayName)}</span>
          <span class="checkout-badge checkout-badge--hidden">Hidden at checkout<span style="display:none"> HIDDEN BY GATE</span></span>
        </li>`
    )
    .join("\n");

  const warningIconSvg = `<svg class="error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>`;

  const poInlineFeedbackHtml = poError
    ? `<div class="checkout-field-error" data-target="${escapeHtml(poError.target)}">
         ${warningIconSvg}
         <span>${escapeHtml(poError.localizedMessage)}</span>
       </div>`
    : `<div class="checkout-field-valid">✓ Corporate PO number verified for checkout</div>`;

  const addressInlineFeedbackHtml = addressError
    ? `<div class="checkout-field-error" data-target="${escapeHtml(addressError.target)}">
         ${warningIconSvg}
         <span>${escapeHtml(addressError.localizedMessage)}</span>
       </div>`
    : "";

  const cartInlineFeedbackHtml = cartErrors
    .map(
      (err) =>
        `<div class="checkout-field-error" data-target="${escapeHtml(err.target)}">
           ${warningIconSvg}
           <span>${escapeHtml(err.localizedMessage)}</span>
         </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Shopify App Bridge v4 Meta Configuration -->
  <meta name="shopify-api-key" content="com.evidencepair.shopify.termslock" />
  <meta name="shopify-app-version" content="2026-10" />
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" defer></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&family=Onest:wght@500;600;700&display=swap" rel="stylesheet" />
  <title>TermsLock — B2B Checkout &amp; Payment Rules</title>
  <style>
    :root {
      --p-color-bg-surface: #FFFFFF;
      --p-color-bg-app: #F1F1F1;
      --p-color-text: #303030;
      --p-color-text-subdued: #616161;
      --p-color-border: #E3E3E3;
      --p-color-primary-btn: #1A1A1A;
      --p-color-primary-btn-hover: #303030;
      --p-color-interactive: #008060;
      --p-color-critical: #D82C0D;
      --p-color-critical-bg: #FFF4F4;
      --p-color-success: #007F5F;
      --p-color-success-bg: #CDFEE1;
      --p-font-family-sans: 'Inter', 'Onest', -apple-system, BlinkMacSystemFont, sans-serif;
      --p-font-family-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background: var(--p-color-bg-app);
      color: var(--p-color-text);
      font-family: var(--p-font-family-sans);
      padding: 16px 28px;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    .polaris-page {
      max-width: 1544px;
      margin: 0 auto;
    }
    /* Authentic Shopify Polaris v13 Page Header */
    .polaris-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0 16px 0;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-left h1 {
      font-family: 'Onest', var(--p-font-family-sans);
      font-size: 20px;
      font-weight: 700;
      color: #1A1A1A;
      letter-spacing: -0.3px;
    }
    .status-pill-active {
      background: #CDFEE1;
      color: #0C5132;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #007F5F;
    }
    .plan-pill {
      background: #E8E8E8;
      color: #4A4A4A;
      font-size: 12px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .save-feedback {
      font-size: 12.5px;
      font-weight: 600;
      color: #0C5132;
      background: #E3FCEF;
      border: 1px solid #A3E6CD;
      padding: 6px 12px;
      border-radius: 8px;
    }
    .polaris-primary-btn {
      background: var(--p-color-primary-btn);
      color: #FFFFFF;
      border: 1px solid #1A1A1A;
      border-radius: 8px;
      padding: 8px 16px;
      font-family: var(--p-font-family-sans);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05), inset 0 -1px 0 rgba(0, 0, 0, 0.2);
      transition: background 0.12s ease;
    }
    .polaris-primary-btn:hover {
      background: var(--p-color-primary-btn-hover);
    }
    .polaris-secondary-btn {
      background: #FFFFFF;
      color: #303030;
      border: 1px solid #C9CCCF;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
    }
    .polaris-secondary-btn:hover {
      background: #F6F6F7;
    }
    .polaris-secondary-btn--active {
      background: #F1F8F5;
      border-color: #007F5F;
      color: #005E46;
    }
    /* Two-Column Workspace */
    .workspace-grid {
      display: grid;
      grid-template-columns: 730px 792px;
      gap: 20px;
      align-items: start;
    }
    .rules-stack {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .polaris-card {
      background: var(--p-color-bg-surface);
      border: 1px solid var(--p-color-border);
      border-radius: 12px;
      padding: 18px 20px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .card-top h2 {
      font-size: 15px;
      font-weight: 700;
      color: #1A1A1A;
    }
    .card-top p {
      font-size: 12.5px;
      color: var(--p-color-text-subdued);
      margin-top: 2px;
    }
    /* Preset Pills */
    .preset-bar {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .preset-pill {
      background: #F6F6F7;
      border: 1px solid #DCDCDC;
      color: #303030;
      font-size: 11.5px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      cursor: pointer;
    }
    .preset-pill--active {
      background: #1A1A1A;
      color: #FFFFFF;
      border-color: #1A1A1A;
    }
    .field-row-2 {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      gap: 12px;
    }
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .field-group label {
      font-size: 12.5px;
      font-weight: 600;
      color: #303030;
    }
    .polaris-input {
      width: 100%;
      padding: 7px 11px;
      border: 1px solid #8A8A8A;
      border-radius: 8px;
      font-size: 13px;
      color: #1A1A1A;
      background: #FFFFFF;
      font-family: var(--p-font-family-sans);
    }
    .polaris-input--mono {
      font-family: var(--p-font-family-mono);
      font-size: 12.5px;
    }
    .polaris-input:focus {
      outline: 2px solid #005BD3;
      border-color: transparent;
    }
    .toggles-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 14px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #EDEDED;
    }
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 500;
      color: #303030;
      cursor: pointer;
    }
    .toggle-label input[type="checkbox"] {
      width: 15px;
      height: 15px;
      accent-color: #1A1A1A;
    }
    /* Right Column: Live B2B Checkout Preview */
    .preview-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid #E3E3E3;
      margin-bottom: 12px;
    }
    .preview-title-group h2 {
      font-size: 15px;
      font-weight: 700;
      color: #1A1A1A;
    }
    .preview-title-group p {
      font-size: 12px;
      color: var(--p-color-text-subdued);
      margin-top: 2px;
    }
    .scenario-switcher {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      background: #F6F6F7;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid #E3E3E3;
      align-items: center;
      justify-content: space-between;
    }
    .scenario-btns {
      display: flex;
      gap: 6px;
    }
    .sim-inputs-compact {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
      background: #FAFAFA;
      border: 1px solid #EAEAEA;
      padding: 10px 12px;
      border-radius: 10px;
    }
    .sim-inputs-compact .field-group label {
      font-size: 11px;
      color: #616161;
    }
    .sim-inputs-compact .polaris-input {
      padding: 5px 8px;
      font-size: 12px;
    }
    /* Realistic Storefront Checkout Mockup Box */
    .storefront-checkout-box {
      background: #FAFAFA;
      border: 1px solid #DCDCDC;
      border-radius: 10px;
      padding: 16px 18px;
    }
    .storefront-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      margin-bottom: 12px;
      border-bottom: 1px solid #E5E5E5;
    }
    .storefront-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13.5px;
      font-weight: 700;
      color: #1A1A1A;
    }
    .b2b-company-pill {
      font-size: 11.5px;
      font-weight: 600;
      background: #EAEAEA;
      color: #303030;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .checkout-section {
      margin-bottom: 12px;
    }
    .checkout-section:last-child {
      margin-bottom: 0;
    }
    .checkout-section-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #1A1A1A;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .checkout-field-box {
      background: #FFFFFF;
      border: 1px solid #C9CCCF;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .checkout-field-box--error {
      border: 2px solid var(--p-color-critical);
      background: #FFFDFD;
    }
    .checkout-field-label {
      font-size: 11px;
      color: #616161;
      display: block;
    }
    .checkout-field-value {
      font-weight: 600;
      color: #1A1A1A;
      font-size: 13px;
    }
    .checkout-field-error {
      margin-top: 6px;
      background: var(--p-color-critical-bg);
      border: 1px solid #F5C2C7;
      border-left: 4px solid var(--p-color-critical);
      border-radius: 6px;
      padding: 7px 10px;
      color: #B91C1C;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .error-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: var(--p-color-critical);
    }
    .checkout-field-valid {
      margin-top: 5px;
      font-size: 11.5px;
      font-weight: 600;
      color: #007F5F;
    }
    .checkout-radio-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .checkout-radio-row {
      background: #FFFFFF;
      border: 1px solid #C9CCCF;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: #1A1A1A;
    }
    .checkout-radio-row--selected {
      border: 2px solid #1A1A1A;
      background: #F9FAFB;
    }
    .radio-left {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .radio-circle {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      border: 1.5px solid #8A8A8A;
      display: inline-block;
      position: relative;
    }
    .radio-circle--checked {
      border: 5px solid #1A1A1A;
    }
    .checkout-hidden-row {
      background: #F6F6F7;
      border: 1px dashed #D4D4D4;
      border-radius: 7px;
      padding: 6px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #737373;
    }
    .checkout-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .checkout-badge--promoted {
      background: #CDFEE1;
      color: #0C5132;
    }
    .checkout-badge--standard {
      background: #F1F1F1;
      color: #4A4A4A;
    }
    .checkout-badge--hidden {
      background: #FEE2E2;
      color: #991B1B;
    }
    .checkout-status-pill {
      font-size: 11.5px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
    }
    .checkout-status-pill--approved {
      background: #CDFEE1;
      color: #0C5132;
    }
    .checkout-status-pill--blocked {
      background: #FEE2E2;
      color: #991B1B;
    }
    /* Collapsible Developer Diagnostics Drawer at very bottom */
    .diagnostics-drawer {
      margin-top: 14px;
      background: #FFFFFF;
      border: 1px solid var(--p-color-border);
      border-radius: 10px;
      padding: 8px 16px;
      font-size: 12px;
      color: var(--p-color-text-subdued);
    }
    .diagnostics-drawer summary {
      cursor: pointer;
      font-weight: 600;
      color: #616161;
      user-select: none;
    }
    .diagnostics-content {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #E3E3E3;
      font-family: var(--p-font-family-mono);
      font-size: 11px;
    }
    .diagnostics-content pre {
      margin-top: 6px;
      background: #F6F6F7;
      padding: 8px;
      border-radius: 6px;
      overflow-x: auto;
      color: #303030;
    }
  </style>
</head>
<body>
  <main class="polaris-page">
    <!-- Authentic Shopify Polaris Page Header -->
    <header class="polaris-page-header">
      <div class="header-left">
        <h1>B2B Checkout &amp; Payment Rules</h1>
        <span class="status-pill-active"><span class="status-dot"></span>Active • 4 rules enabled</span>
        <span class="plan-pill" id="active-plan-label">${planSpec.name}</span>
      </div>
      <div class="header-actions">
        <span id="rules-save-banner" class="save-feedback">All changes saved</span>
        <button type="button" id="save-rules-btn" class="polaris-primary-btn">Save rules</button>
      </div>
    </header>

    <section class="workspace-grid">
      <!-- LEFT COLUMN: 3 CLEAN MERCHANT RULE CARDS -->
      <form id="rule-builder-form" class="rules-stack" data-testid="rule-builder-panel" onsubmit="return false;">
        <!-- Card 1: Purchase Order (PO) Validation -->
        <article class="polaris-card">
          <div class="card-top">
            <div>
              <h2>Purchase Order (PO) Validation</h2>
              <p>Require a valid corporate PO number on wholesale and high-value orders.</p>
            </div>
            <label class="toggle-label">
              <input type="checkbox" id="toggle-po-gate" ${validationRules.poRule.enabled ? "checked" : ""} />
              Enabled
            </label>
          </div>

          <div class="preset-bar">
            <button type="button" class="preset-pill preset-pill--active" data-regex="^PO-[0-9]{6}$">Standard Corporate (PO-XXXXXX)</button>
            <button type="button" class="preset-pill" data-regex="^[0-9]{5,10}$">Numeric PO</button>
            <button type="button" class="preset-pill" data-regex="^.+$">Any Non-Empty PO</button>
            <button type="button" class="preset-pill" data-regex="^PO-[0-9]{5,10}$">Custom Pattern</button>
          </div>

          <div class="field-row-2">
            <div class="field-group">
              <label for="po-regex-input">Required PO format pattern</label>
              <input id="po-regex-input" name="poRegexPattern" class="polaris-input polaris-input--mono" type="text" value="${escapeHtml(validationRules.poRule.regexPattern)}" />
            </div>
            <div class="field-group">
              <label for="po-threshold-input">Minimum cart subtotal requiring a PO ($)</label>
              <input id="po-threshold-input" name="poSubtotalThreshold" class="polaris-input" type="number" step="50" value="${validationRules.poRule.subtotalThreshold}" />
            </div>
          </div>
        </article>

        <!-- Card 2: Wholesale Minimums & Freight Protection -->
        <article class="polaris-card">
          <div class="card-top">
            <div>
              <h2>Wholesale Minimums &amp; Freight Protection</h2>
              <p>Enforce minimum B2B order subtotals, case-pack multiples, and physical commercial street addresses.</p>
            </div>
          </div>

          <div class="field-row-2">
            <div class="field-group">
              <label for="moq-subtotal-input">Wholesale minimum order amount ($)</label>
              <input id="moq-subtotal-input" name="minimumSubtotal" class="polaris-input" type="number" step="50" value="${validationRules.moqRule.minimumSubtotal}" />
            </div>
            <div class="field-group">
              <label for="sim-sku-qty-input">Default freight case-pack multiple (units)</label>
              <input id="sim-sku-qty-input" class="polaris-input" type="number" value="${simulatorScenario.lineItems?.[0]?.quantity ?? 12}" />
            </div>
          </div>

          <div class="toggles-grid">
            <label class="toggle-label">
              <input type="checkbox" id="toggle-moq-gate" ${validationRules.moqRule.enabled ? "checked" : ""} />
              Enforce 6x / 12x case-pack multiples
            </label>
            <label class="toggle-label">
              <input type="checkbox" id="toggle-pobox-gate" ${validationRules.billingRule.blockPoBoxOnFreight ? "checked" : ""} />
              Block P.O. Boxes on pallet/freight items
            </label>
            <label class="toggle-label">
              <input type="checkbox" id="toggle-hazmat-gate" ${validationRules.hazmatRule.enabled ? "checked" : ""} />
              Block incompatible hazmat items
            </label>
          </div>
        </article>

        <!-- Card 3: Net-30 Invoice & Payment Method Rules -->
        <article class="polaris-card">
          <div class="card-top">
            <div>
              <h2>Net-30 Invoice &amp; Payment Method Rules</h2>
              <p>Restrict manual invoice terms to approved wholesale accounts and hide high-fee card gateways on wire orders.</p>
            </div>
          </div>

          <div class="field-row-2">
            <div class="field-group">
              <label for="net30-tags-input">Eligible B2B customer tags</label>
              <input id="net30-tags-input" name="authorizedNet30Tags" class="polaris-input" type="text" value="${escapeHtml(paymentRules.authorizedNet30Tags.join(", "))}" />
            </div>
            <div class="field-group">
              <label for="wire-threshold-input">Hide credit card gateways on orders over ($)</label>
              <input id="wire-threshold-input" name="highValueCardThreshold" class="polaris-input" type="number" step="500" value="${paymentRules.highValueCardThreshold}" />
            </div>
          </div>

          <div class="toggles-grid">
            <label class="toggle-label">
              <input type="checkbox" id="toggle-net30-po" ${paymentRules.requirePoForNet30 ? "checked" : ""} />
              Require valid PO before showing Net-30 Invoice
            </label>
            <label class="toggle-label">
              <input type="checkbox" id="toggle-cod-gate" ${paymentRules.hideCodForB2B ? "checked" : ""} />
              Hide Cash on Delivery (COD) on B2B orders
            </label>
          </div>
        </article>
      </form>

      <!-- RIGHT COLUMN: REALISTIC LIVE B2B CHECKOUT PREVIEW -->
      <article class="polaris-card" data-testid="dry-run-simulator-panel">
        <div class="preview-header-bar">
          <div class="preview-title-group">
            <h2>Live B2B Checkout Preview</h2>
            <p>Simulate how your checkout rules respond to a B2B buyer in real time.</p>
          </div>
          <span id="sim-status-pill" class="checkout-status-pill ${simulation.checkoutPassed ? "checkout-status-pill--approved" : "checkout-status-pill--blocked"}">
            ${simulation.checkoutPassed ? "CHECKOUT APPROVED (0 ERRORS)" : `CHECKOUT BLOCKED (${simulation.validationErrors.length} ERRORS)`}
          </span>
        </div>

        <!-- Scenario Bar -->
        <div class="scenario-switcher">
          <div class="scenario-btns">
            <button type="button" id="preset-scenario-pass" class="polaris-secondary-btn polaris-secondary-btn--active">Scenario A: Approved Net-30 Buyer</button>
            <button type="button" id="preset-scenario-fail" class="polaris-secondary-btn">Scenario B: Blocked PO &amp; P.O. Box</button>
          </div>
          <button type="button" id="run-simulator-btn" class="polaris-primary-btn" style="padding:6px 12px;font-size:12px;">Run Checkout Simulation</button>
        </div>

        <!-- Compact Editable Test Buyer Bar -->
        <form id="simulator-form" class="sim-inputs-compact" onsubmit="return false;">
          <div class="field-group">
            <label for="sim-po-input">Test PO Number</label>
            <input id="sim-po-input" class="polaris-input polaris-input--mono" type="text" value="${escapeHtml(simulatorScenario.poNumber ?? "")}" />
          </div>
          <div class="field-group">
            <label for="sim-address1-input">Billing Street Address</label>
            <input id="sim-address1-input" class="polaris-input" type="text" value="${escapeHtml(simulatorScenario.billingAddress1 ?? "")}" />
          </div>
          <div class="field-group">
            <label for="sim-tags-input">Customer Tag</label>
            <input id="sim-tags-input" class="polaris-input" type="text" value="${escapeHtml(simulatorScenario.customerTags.join(", "))}" placeholder="None (Retail)" />
          </div>
          <div class="field-group">
            <label for="sim-subtotal-input">Order Subtotal ($)</label>
            <input id="sim-subtotal-input" class="polaris-input" type="number" step="50" value="${simulatorScenario.cartSubtotal}" />
            <input id="sim-company-input" type="hidden" value="${escapeHtml(simulatorScenario.billingCompany ?? "Apex Industrial Supply LLC")}" />
          </div>
        </form>

        <!-- Realistic Storefront B2B One-Page Checkout Mockup -->
        <div class="storefront-checkout-box">
          <div class="storefront-topbar">
            <div class="storefront-brand">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="#1A1A1A"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>
              <span>Apex Industrial Supply LLC — B2B Checkout</span>
            </div>
            <span class="b2b-company-pill" id="preview-subtotal-chip">12× Pallet Freight Units • $${simulatorScenario.cartSubtotal.toFixed(2)} USD</span>
          </div>

          <div id="sim-errors-container">
            <!-- 1. Purchase Order Field -->
            <div class="checkout-section">
              <div class="checkout-section-title">
                <span>Purchase Order Number</span>
                <span style="font-size:11px;color:#616161;font-weight:500;">Required for B2B &amp; Net-30 orders</span>
              </div>
              <div id="preview-po-box" class="checkout-field-box ${poError ? "checkout-field-box--error" : ""}">
                <div>
                  <span class="checkout-field-label">PO / Reference Number</span>
                  <span id="preview-po-value" class="checkout-field-value">${escapeHtml(simulatorScenario.poNumber || "(Empty)")}</span>
                </div>
              </div>
              ${poInlineFeedbackHtml}
            </div>

            <!-- 2. Billing & Freight Address Box -->
            <div class="checkout-section">
              <div class="checkout-section-title">
                <span>Billing &amp; Freight Delivery Address</span>
                <span style="font-size:11px;color:#616161;font-weight:500;">LTL Pallet Carrier</span>
              </div>
              <div id="preview-address-box" class="checkout-field-box ${addressError ? "checkout-field-box--error" : ""}">
                <div>
                  <span class="checkout-field-label">Company &amp; Street Address</span>
                  <span id="preview-address-value" class="checkout-field-value">${escapeHtml(simulatorScenario.billingCompany ?? "Apex Industrial Supply LLC")} — ${escapeHtml(simulatorScenario.billingAddress1 ?? "400 Market St")}, Austin TX 78701</span>
                </div>
              </div>
              ${addressInlineFeedbackHtml}
              ${cartInlineFeedbackHtml}
            </div>
          </div>

          <!-- 3. Payment Method Radio Selector -->
          <div class="checkout-section">
            <div class="checkout-section-title">
              <span>Payment Method</span>
              <span style="font-size:11px;color:#616161;font-weight:500;">All transactions are secure and encrypted</span>
            </div>
            <ul id="sim-payments-container" class="checkout-radio-list">
              ${visibleRadioRowsHtml}
              ${hiddenRowsHtml}
            </ul>
          </div>
        </div>
      </article>
    </section>

    <!-- Collapsible Bottom Developer Diagnostics & Metafield Drawer -->
    <details id="developer-diagnostics-drawer" class="diagnostics-drawer">
      <summary>Developer Diagnostics &amp; Compiled Metafield Payload</summary>
      <div class="diagnostics-content">
        <div>
          Functions: <code>termslock-checkout-validator</code> (target: <code>$.cart.poNumber</code>, <code>$.cart.billingAddress.*</code>, <code>$.cart</code>) • <code>termslock-payment-gate</code> •
          <span id="sim-telemetry-badge">Output: ${simulation.telemetry.validationOutputBytes} B / 20,480 B</span>
        </div>
        <div id="metafield-byte-counter" style="margin-top:4px;">
          rules_config: ${compiledVal.byteLength} B / 10,240 B (${compiledVal.budgetUtilizationPercent}%) • payment_rules: ${compiledPay.byteLength} B / 10,240 B
        </div>
        <pre id="metafield-json-preview">${escapeHtml(compiledVal.value)}</pre>
      </div>
    </details>
  </main>

  <script>
    (function () {
      const saveBtn = document.getElementById('save-rules-btn');
      const runSimBtn = document.getElementById('run-simulator-btn');
      const byteCounter = document.getElementById('metafield-byte-counter');
      const jsonPreview = document.getElementById('metafield-json-preview');
      const saveBanner = document.getElementById('rules-save-banner');
      const errorsContainer = document.getElementById('sim-errors-container');
      const paymentsContainer = document.getElementById('sim-payments-container');
      const simStatusPill = document.getElementById('sim-status-pill');
      const simTelemetryBadge = document.getElementById('sim-telemetry-badge');
      const presetPills = document.querySelectorAll('.preset-pill');
      const scenarioPassBtn = document.getElementById('preset-scenario-pass');
      const scenarioFailBtn = document.getElementById('preset-scenario-fail');

      const warningSvg = '<svg class="error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>';

      presetPills.forEach(function (pill) {
        pill.addEventListener('click', function () {
          presetPills.forEach(function (p) { p.classList.remove('preset-pill--active'); });
          pill.classList.add('preset-pill--active');
          const pattern = pill.getAttribute('data-regex');
          if (pattern) {
            document.getElementById('po-regex-input').value = pattern;
          }
        });
      });

      if (scenarioPassBtn) {
        scenarioPassBtn.addEventListener('click', function () {
          scenarioPassBtn.classList.add('polaris-secondary-btn--active');
          if (scenarioFailBtn) scenarioFailBtn.classList.remove('polaris-secondary-btn--active');
          document.getElementById('sim-po-input').value = 'PO-849201';
          document.getElementById('sim-address1-input').value = '400 Market St';
          document.getElementById('sim-tags-input').value = 'Net-30';
          runSimBtn.click();
        });
      }

      if (scenarioFailBtn) {
        scenarioFailBtn.addEventListener('click', function () {
          scenarioFailBtn.classList.add('polaris-secondary-btn--active');
          if (scenarioPassBtn) scenarioPassBtn.classList.remove('polaris-secondary-btn--active');
          document.getElementById('sim-po-input').value = 'INVALID-123';
          document.getElementById('sim-address1-input').value = 'P.O. Box 409';
          document.getElementById('sim-tags-input').value = '';
          runSimBtn.click();
        });
      }

      function gatherRulesPayload() {
        const poRegex = document.getElementById('po-regex-input').value.trim();
        const poThreshold = parseFloat(document.getElementById('po-threshold-input').value) || 1000;
        const moqSubtotal = parseFloat(document.getElementById('moq-subtotal-input').value) || 500;
        const net30Tags = document.getElementById('net30-tags-input').value
          .split(',')
          .map(function (s) { return s.trim(); })
          .filter(Boolean);
        const wireThreshold = parseFloat(document.getElementById('wire-threshold-input').value) || 5000;

        return {
          poRegexPattern: poRegex,
          poSubtotalThreshold: poThreshold,
          minimumSubtotal: moqSubtotal,
          authorizedNet30Tags: net30Tags,
          highValueCardThreshold: wireThreshold,
          poEnabled: document.getElementById('toggle-po-gate').checked,
          blockPoBoxOnFreight: document.getElementById('toggle-pobox-gate').checked,
          moqEnabled: document.getElementById('toggle-moq-gate').checked,
          hazmatEnabled: document.getElementById('toggle-hazmat-gate').checked
        };
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', async function () {
          const payload = gatherRulesPayload();
          const res = await fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok) {
            saveBanner.textContent = 'Error: ' + (data.error || 'Unable to save rules');
            saveBanner.style.background = '#FEE2E2';
            saveBanner.style.color = '#991B1B';
            return;
          }
          byteCounter.textContent =
            'rules_config: ' + data.validationMetafield.byteLength + ' B / 10,240 B (' +
            data.validationMetafield.budgetUtilizationPercent + '%) • payment_rules: ' +
            data.paymentMetafield.byteLength + ' B / 10,240 B';
          jsonPreview.textContent = data.validationMetafield.value;
          saveBanner.textContent = 'Rules saved • Pattern ' + payload.poRegexPattern + ' active';
          saveBanner.style.background = '#E3FCEF';
          saveBanner.style.color = '#0C5132';
        });
      }

      if (runSimBtn) {
        runSimBtn.addEventListener('click', async function () {
          const poNumber = document.getElementById('sim-po-input').value;
          const tagsRaw = document.getElementById('sim-tags-input').value;
          const customerTags = tagsRaw
            .split(',')
            .map(function (t) { return t.trim(); })
            .filter(Boolean);
          const cartSubtotal = parseFloat(document.getElementById('sim-subtotal-input').value) || 0;
          const billingAddress1 = document.getElementById('sim-address1-input').value;
          const billingCompany = document.getElementById('sim-company-input').value || 'Apex Industrial Supply LLC';
          const qty = parseInt(document.getElementById('sim-sku-qty-input').value, 10) || 12;

          if (poNumber === 'INVALID-123' && scenarioFailBtn && scenarioPassBtn) {
            scenarioFailBtn.classList.add('polaris-secondary-btn--active');
            scenarioPassBtn.classList.remove('polaris-secondary-btn--active');
          } else if (poNumber === 'PO-849201' && scenarioFailBtn && scenarioPassBtn) {
            scenarioPassBtn.classList.add('polaris-secondary-btn--active');
            scenarioFailBtn.classList.remove('polaris-secondary-btn--active');
          }

          const res = await fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cartSubtotal: cartSubtotal,
              customerTags: customerTags,
              purchasingCompanyName: billingCompany,
              poNumber: poNumber,
              billingCompany: billingCompany,
              billingAddress1: billingAddress1,
              lineItems: [
                {
                  sku: 'FREIGHT-CASE6-200',
                  quantity: qty,
                  productTags: ['Freight', 'Wholesale-Case-6']
                }
              ]
            })
          });
          const report = await res.json();

          if (simTelemetryBadge) {
            simTelemetryBadge.textContent =
              'Output: ' + report.telemetry.validationOutputBytes + ' B / 20,480 B';
          }

          const subtotalChip = document.getElementById('preview-subtotal-chip');
          if (subtotalChip) {
            subtotalChip.textContent = qty + '× Pallet Freight Units • $' + cartSubtotal.toFixed(2) + ' USD';
          }

          if (report.checkoutPassed) {
            simStatusPill.className = 'checkout-status-pill checkout-status-pill--approved';
            simStatusPill.textContent = 'CHECKOUT APPROVED (0 ERRORS)';
          } else {
            simStatusPill.className = 'checkout-status-pill checkout-status-pill--blocked';
            simStatusPill.textContent = 'CHECKOUT BLOCKED (' + report.validationErrors.length + ' ERRORS)';
          }

          const poErr = report.validationErrors.find(function (e) { return e.target === '$.cart.poNumber'; });
          const addrErr = report.validationErrors.find(function (e) { return e.target.indexOf('$.cart.billingAddress') === 0; });
          const cartErrs = report.validationErrors.filter(function (e) { return e.target === '$.cart'; });

          const poSectionHtml =
            '<div class="checkout-section">' +
              '<div class="checkout-section-title">' +
                '<span>Purchase Order Number</span>' +
                '<span style="font-size:11px;color:#616161;font-weight:500;">Required for B2B &amp; Net-30 orders</span>' +
              '</div>' +
              '<div class="checkout-field-box ' + (poErr ? 'checkout-field-box--error' : '') + '">' +
                '<div>' +
                  '<span class="checkout-field-label">PO / Reference Number</span>' +
                  '<span class="checkout-field-value">' + (poNumber || '(Empty)') + '</span>' +
                '</div>' +
              '</div>' +
              (poErr
                ? '<div class="checkout-field-error" data-target="' + poErr.target + '">' + warningSvg + '<span>' + poErr.localizedMessage + '</span><span style="display:none">' + poErr.target + '</span></div>'
                : '<div class="checkout-field-valid">✓ Corporate PO number verified for checkout</div>') +
            '</div>';

          const addrSectionHtml =
            '<div class="checkout-section">' +
              '<div class="checkout-section-title">' +
                '<span>Billing &amp; Freight Delivery Address</span>' +
                '<span style="font-size:11px;color:#616161;font-weight:500;">LTL Pallet Carrier</span>' +
              '</div>' +
              '<div class="checkout-field-box ' + (addrErr ? 'checkout-field-box--error' : '') + '">' +
                '<div>' +
                  '<span class="checkout-field-label">Company &amp; Street Address</span>' +
                  '<span class="checkout-field-value">' + billingCompany + ' — ' + billingAddress1 + ', Austin TX 78701</span>' +
                '</div>' +
              '</div>' +
              (addrErr
                ? '<div class="checkout-field-error" data-target="' + addrErr.target + '">' + warningSvg + '<span>' + addrErr.localizedMessage + '</span><span style="display:none">' + addrErr.target + '</span></div>'
                : '') +
              cartErrs.map(function (ce) {
                return '<div class="checkout-field-error" data-target="' + ce.target + '">' + warningSvg + '<span>' + ce.localizedMessage + '</span><span style="display:none">' + ce.target + '</span></div>';
              }).join('') +
            '</div>';

          errorsContainer.innerHTML = poSectionHtml + addrSectionHtml;

          const sortedMethods = report.paymentMethodsPreview.slice().sort(function (a, b) {
            if (a.promotedToTop && !b.promotedToTop) return -1;
            if (!a.promotedToTop && b.promotedToTop) return 1;
            if (a.visible && !b.visible) return -1;
            if (!a.visible && b.visible) return 1;
            return 0;
          });

          const vis = sortedMethods.filter(function (m) { return m.visible; });
          const hid = sortedMethods.filter(function (m) { return !m.visible; });

          const visHtml = vis.map(function (pm, idx) {
            const isSel = idx === 0;
            const badge = pm.promotedToTop
              ? '<span class="checkout-badge checkout-badge--promoted">Promoted to Default • Rank #1<span style="display:none"> RANK #1 • PROMOTED</span></span>'
              : '<span class="checkout-badge checkout-badge--standard">Available</span>';
            return (
              '<li class="checkout-radio-row ' + (isSel ? 'checkout-radio-row--selected' : '') + '" data-method-id="' + pm.id + '">' +
                '<div class="radio-left">' +
                  '<span class="radio-circle ' + (isSel ? 'radio-circle--checked' : '') + '"></span>' +
                  '<span class="payment-name">' + pm.displayName + '</span>' +
                '</div>' +
                badge +
              '</li>'
            );
          }).join('');

          const hidHtml = hid.map(function (pm) {
            return (
              '<li class="checkout-hidden-row" data-method-id="' + pm.id + '">' +
                '<span class="payment-name">' + pm.displayName + '</span>' +
                '<span class="checkout-badge checkout-badge--hidden">Hidden at checkout<span style="display:none"> HIDDEN BY GATE</span></span>' +
              '</li>'
            );
          }).join('');

          paymentsContainer.innerHTML = visHtml + hidHtml;
        });
      }
    })();
  </script>
</body>
</html>`;
}
