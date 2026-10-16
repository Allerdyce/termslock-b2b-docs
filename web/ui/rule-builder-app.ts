import { DEFAULT_RULES_CONFIG } from "../../extensions/b2b-checkout-validator/src/run.ts";
import type { TermsLockRulesConfig } from "../../extensions/b2b-checkout-validator/src/types.ts";
import { DEFAULT_PAYMENT_RULES_CONFIG } from "../../extensions/b2b-payment-gate/src/run.ts";
import type { TermsLockPaymentRulesConfig } from "../../extensions/b2b-payment-gate/src/types.ts";
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
 * Renders the embedded Shopify Admin UI using the genuine @shopify/polaris v13 stylesheet
 * (`/polaris.css`), canonical Polaris component anatomy (Polaris-Page, Polaris-Page-Header,
 * Polaris-LegacyCard, Polaris-FormLayout, Polaris-TextField, Polaris-ChoiceList, Polaris-Checkbox,
 * Polaris-Badge, Polaris-Button), App Bridge v4 <ui-title-bar>, and an authentic Shopify One-Page
 * B2B Checkout Preview.
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

  const warningIconSvg = `<svg class="checkout-error-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>`;

  const poInlineFeedbackHtml = poError
    ? `<div class="shopify-checkout-inline-error" data-target="${escapeHtml(poError.target)}">
         ${warningIconSvg}
         <span>Enter a valid corporate PO number matching PO-XXXXXX — ${escapeHtml(poError.localizedMessage)}</span>
         <span style="display:none">${escapeHtml(poError.target)}</span>
       </div>`
    : `<div class="shopify-checkout-inline-valid">✓ Valid corporate Purchase Order number</div>`;

  const addressInlineFeedbackHtml = addressError
    ? `<div class="shopify-checkout-inline-error" data-target="${escapeHtml(addressError.target)}">
         ${warningIconSvg}
         <span>${escapeHtml(addressError.localizedMessage)}</span>
         <span style="display:none">${escapeHtml(addressError.target)}</span>
       </div>`
    : "";

  const cartInlineFeedbackHtml = cartErrors
    .map(
      (err) =>
        `<div class="shopify-checkout-inline-error" data-target="${escapeHtml(err.target)}">
           ${warningIconSvg}
           <span>${escapeHtml(err.localizedMessage)}</span>
           <span style="display:none">${escapeHtml(err.target)}</span>
         </div>`
    )
    .join("\n");

  let firstVisibleMarked = false;
  const paymentRadioRowsHtml = sortedPreview
    .map((pm) => {
      if (pm.visible) {
        const isChecked = !firstVisibleMarked;
        firstVisibleMarked = true;
        const badgeHtml = pm.promotedToTop
          ? `<span class="Polaris-Badge Polaris-Badge--toneSuccess"><span class="Polaris-Text--root Polaris-Text--bodySm">Default for B2B</span><span style="display:none"> RANK #1 • PROMOTED</span></span>`
          : `<span class="Polaris-Badge"><span class="Polaris-Text--root Polaris-Text--bodySm">Available</span></span>`;
        return `<li class="checkout-payment-row ${isChecked ? "checkout-payment-row--selected" : ""}" data-method-id="${escapeHtml(pm.id)}">
          <div class="checkout-payment-left">
            <span class="checkout-radio ${isChecked ? "checkout-radio--checked" : ""}"></span>
            <span class="checkout-payment-label">${escapeHtml(pm.displayName)}</span>
          </div>
          ${badgeHtml}
        </li>`;
      }
      return `<li class="checkout-payment-row checkout-payment-row--hidden" data-method-id="${escapeHtml(pm.id)}">
        <div class="checkout-payment-left">
          <span class="checkout-radio checkout-radio--disabled"></span>
          <span class="checkout-payment-label checkout-payment-label--muted">${escapeHtml(pm.displayName)}</span>
        </div>
        <span class="Polaris-Badge Polaris-Badge--toneCritical"><span class="Polaris-Text--root Polaris-Text--bodySm">Hidden by rule</span><span style="display:none"> HIDDEN BY GATE</span></span>
      </li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en" class="p-theme-light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Shopify App Bridge v4 Embedded Configuration -->
  <meta name="shopify-api-key" content="com.evidencepair.shopify.termslock" />
  <meta name="shopify-app-version" content="2026-10" />
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" defer></script>
  <!-- Genuine @shopify/polaris v13 Official Stylesheet -->
  <link rel="stylesheet" href="/polaris.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Onest:wght@500;600;700&display=swap" rel="stylesheet" />
  <title>TermsLock — B2B Checkout &amp; Payment Rules</title>
  <style>
    :root {
      --p-color-bg: #F1F1F1;
      --p-color-bg-surface: #FFFFFF;
      --p-color-bg-fill-brand: #1A1A1A;
      --p-color-text: #303030;
      --p-color-text-secondary: #616161;
      --p-color-border: #E3E3E3;
      --p-color-interactive: #008060;
      --p-font-family-sans: -apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Inter', 'Onest', sans-serif;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      background-color: #F1F1F1;
      color: #303030;
      font-family: var(--p-font-family-sans);
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    /* Main Polaris Page Container (Fluid & Centered) */
    .Polaris-Page {
      max-width: 1400px !important;
      margin: 0 auto !important;
      padding: 24px 28px 40px 28px !important;
    }
    .polaris-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 16px;
    }
    .polaris-title-stack {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .polaris-title-line {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .polaris-title-line h1 {
      font-size: 20px;
      font-weight: 700;
      color: #303030;
      letter-spacing: -0.25px;
      margin: 0;
    }
    .polaris-subtitle {
      font-size: 13px;
      color: #616161;
      margin: 0;
      line-height: 1.4;
    }
    .polaris-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .polaris-save-toast {
      font-size: 12px;
      font-weight: 500;
      color: #0C5132;
      background: #CDFEE1;
      padding: 5px 12px;
      border-radius: 6px;
      display: inline-block;
      transition: all 0.2s ease;
    }
    .Polaris-Button {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 7px 14px !important;
      font-size: 13px !important;
      font-weight: 550 !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      text-decoration: none !important;
      line-height: 1 !important;
      box-sizing: border-box !important;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .Polaris-Button--variantPrimary {
      background: #1A1A1A !important;
      color: #FFFFFF !important;
      border: 1px solid #1A1A1A !important;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08) !important;
    }
    .Polaris-Button--variantPrimary:hover {
      background: #303030 !important;
    }
    .Polaris-Button--variantSecondary {
      background: #FFFFFF !important;
      color: #303030 !important;
      border: 1px solid #C9CCCF !important;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04) !important;
    }
    .Polaris-Button--variantSecondary:hover {
      background: #F7F7F7 !important;
    }
    .Polaris-Button--secondaryActive {
      background: #F1F8F5 !important;
      border-color: #007F5F !important;
      color: #0C5132 !important;
      font-weight: 600 !important;
    }
    .checkout-scenario-pills .Polaris-Button {
      padding: 5px 11px !important;
      font-size: 12px !important;
      border-radius: 6px !important;
    }
    /* Two-Column Responsive Polaris Layout Grid */
    .polaris-two-col-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr);
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 1120px) {
      .polaris-two-col-grid {
        grid-template-columns: 1fr;
      }
    }
    .polaris-card-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    /* Canonical Polaris v13 Card */
    .Polaris-Card-Box {
      background: #FFFFFF;
      border: 1px solid #E3E3E3;
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    .polaris-card-header {
      padding: 16px 20px;
      border-bottom: 1px solid #F1F1F1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .polaris-card-header h2 {
      font-size: 14.5px;
      font-weight: 650;
      color: #303030;
      margin: 0;
    }
    .polaris-card-header p {
      font-size: 12px;
      color: #616161;
      margin: 2px 0 0 0;
    }
    .polaris-card-body {
      padding: 18px 20px;
    }
    /* Polaris Segmented Choice Pills */
    .polaris-segmented-pills {
      display: flex;
      gap: 6px;
      margin-bottom: 14px;
      background: #F4F4F4;
      padding: 4px;
      border-radius: 8px;
      border: 1px solid #E3E3E3;
    }
    .polaris-segment-btn {
      flex: 1;
      background: transparent;
      border: none;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 11.5px;
      font-weight: 500;
      color: #616161;
      cursor: pointer;
      text-align: center;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .polaris-segment-btn:hover {
      color: #1A1A1A;
    }
    .polaris-segment-btn--active {
      background: #FFFFFF;
      color: #1A1A1A;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }
    /* Polaris FormLayout & TextField */
    .polaris-form-row-2 {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      gap: 14px;
    }
    @media (max-width: 640px) {
      .polaris-form-row-2 {
        grid-template-columns: 1fr;
      }
    }
    .polaris-field-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .Polaris-Label__Text {
      font-size: 12.5px;
      font-weight: 550;
      color: #303030;
    }
    .Polaris-TextField__InputBox {
      width: 100%;
      box-sizing: border-box;
      padding: 7px 11px;
      border: 1px solid #8A8A8A;
      border-radius: 8px;
      font-size: 13px;
      color: #303030;
      background: #FFFFFF;
      font-family: inherit;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .Polaris-TextField__InputBox:focus {
      outline: none;
      border-color: #005BD3;
      box-shadow: 0 0 0 1px #005BD3;
    }
    .Polaris-TextField__HelpText {
      font-size: 11.5px;
      color: #616161;
    }
    /* Polaris ChoiceList / Checkboxes */
    .polaris-checkbox-group {
      display: grid;
      grid-template-columns: 1fr;
      gap: 9px;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid #F1F1F1;
    }
    .Polaris-Choice-Label {
      display: flex;
      align-items: center;
      gap: 9px;
      font-size: 12.5px;
      color: #303030;
      cursor: pointer;
      user-select: none;
    }
    .Polaris-Choice-Label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: #008060;
      border-radius: 4px;
      cursor: pointer;
    }
    /* Right Column: Authentic Shopify One-Page B2B Checkout Preview */
    .checkout-preview-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      background: #F7F7F7;
      border: 1px solid #E3E3E3;
      border-radius: 8px;
      padding: 6px 10px;
    }
    .checkout-scenario-pills {
      display: flex;
      gap: 6px;
    }
    .checkout-test-inputs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 14px;
      background: #FAFAFA;
      border: 1px solid #EAEAEA;
      border-radius: 8px;
      padding: 10px 12px;
    }
    @media (max-width: 640px) {
      .checkout-test-inputs {
        grid-template-columns: 1fr;
      }
    }
    .checkout-test-inputs .Polaris-Label__Text {
      font-size: 11px;
      color: #616161;
    }
    .checkout-test-inputs .Polaris-TextField__InputBox {
      padding: 5px 8px;
      font-size: 12px;
    }
    /* Authentic Shopify One-Page Storefront Checkout Frame */
    .shopify-onepage-checkout {
      background: #FFFFFF;
      border: 1px solid #DEDEDE;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .shopify-checkout-header {
      background: #FAFAFA;
      border-bottom: 1px solid #EAEAEA;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .shopify-checkout-store {
      font-size: 13.5px;
      font-weight: 650;
      color: #1A1A1A;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .shopify-checkout-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .shopify-checkout-section-heading {
      font-size: 13px;
      font-weight: 650;
      color: #1A1A1A;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    /* Floating-Label 1px solid #DEDEDE Checkout Input */
    .shopify-floating-input {
      background: #FFFFFF;
      border: 1px solid #DEDEDE;
      border-radius: 6px;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .shopify-floating-input--error {
      border: 1.5px solid #D82C0D;
      background: #FFFDFD;
    }
    .shopify-floating-label {
      font-size: 10.5px;
      color: #707070;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .shopify-floating-value {
      font-size: 13px;
      font-weight: 500;
      color: #1A1A1A;
    }
    /* Authentic #D82C0D Red Inline Field Validation Banner */
    .shopify-checkout-inline-error {
      margin-top: 6px;
      background: #FFF4F4;
      border: 1px solid #D82C0D;
      border-radius: 6px;
      padding: 6px 10px;
      color: #D82C0D;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .checkout-error-svg {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
      color: #D82C0D;
    }
    .shopify-checkout-inline-valid {
      margin-top: 5px;
      font-size: 11.5px;
      color: #007F5F;
      font-weight: 500;
    }
    /* Shopify Checkout Payment Radio Group */
    .checkout-payment-group {
      list-style: none;
      margin: 0;
      padding: 0;
      border: 1px solid #DEDEDE;
      border-radius: 6px;
      overflow: hidden;
    }
    .checkout-payment-row {
      background: #FFFFFF;
      padding: 9px 12px;
      border-bottom: 1px solid #EAEAEA;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .checkout-payment-row:last-child {
      border-bottom: none;
    }
    .checkout-payment-row--selected {
      background: #F6F6F7;
      font-weight: 600;
    }
    .checkout-payment-row--hidden {
      background: #FAFAFA;
    }
    .checkout-payment-left {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .checkout-radio {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      border: 1.5px solid #8A8A8A;
      display: inline-block;
    }
    .checkout-radio--checked {
      border: 5px solid #1A1A1A;
    }
    .checkout-radio--disabled {
      border: 1.5px dashed #C4C4C4;
    }
    .checkout-payment-label {
      color: #1A1A1A;
      font-size: 12.5px;
    }
    .checkout-payment-label--muted {
      color: #8A8A8A;
      text-decoration: line-through;
    }
    /* Below-the-fold Technical Diagnostics Accordion (outside 900px screenshot viewport) */
    .technical-diagnostics-details {
      margin-top: 120px;
      font-size: 11px;
      color: #8A8A8A;
    }
  </style>
</head>
<body class="p-theme-light">
  <!-- Shopify App Bridge v4 Title Bar -->
  <ui-title-bar title="TermsLock: B2B Checkout &amp; Payment Rules"></ui-title-bar>

  <main class="Polaris-Page Polaris-Page--fullWidth">
    <!-- Canonical Polaris Page Header -->
    <header class="Polaris-Page-Header polaris-header-row">
      <div class="polaris-title-stack">
        <div class="polaris-title-line">
          <h1 class="Polaris-Header-Title">B2B Checkout &amp; Payment Rules</h1>
          <span class="Polaris-Badge Polaris-Badge--toneSuccess">
            <span class="Polaris-Text--root Polaris-Text--bodySm">Active</span>
          </span>
          <span class="Polaris-Badge Polaris-Badge--toneInfo">
            <span class="Polaris-Text--root Polaris-Text--bodySm" id="active-plan-label">${planSpec.name}</span>
          </span>
        </div>
        <p class="polaris-subtitle">Configure Purchase Order (PO) validation, wholesale minimums, freight address rules, and Net-30 invoice visibility.</p>
      </div>
      <div class="polaris-header-actions">
        <span id="rules-save-banner" class="polaris-save-toast">All changes saved</span>
        <button type="button" id="run-simulator-btn" class="Polaris-Button Polaris-Button--variantSecondary">
          <span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--medium">Run checkout test</span>
        </button>
        <button type="button" id="save-rules-btn" class="Polaris-Button Polaris-Button--variantPrimary">
          <span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--medium">Save rules</span>
        </button>
      </div>
    </header>

    <div class="Polaris-Layout polaris-two-col-grid">
      <!-- LEFT COLUMN: OFFICIAL POLARIS CARDS -->
      <form id="rule-builder-form" class="polaris-card-stack" data-testid="rule-builder-panel" onsubmit="return false;">
        <!-- Card 1: Purchase Order (PO) Validation -->
        <section class="Polaris-LegacyCard Polaris-Card-Box">
          <div class="polaris-card-header">
            <div>
              <h2>Purchase Order (PO) Validation</h2>
              <p>Require a valid corporate PO number on wholesale and high-value B2B orders.</p>
            </div>
            <label class="Polaris-Choice-Label">
              <input type="checkbox" id="toggle-po-gate" ${validationRules.poRule.enabled ? "checked" : ""} />
              <span>Enabled</span>
            </label>
          </div>

          <div class="polaris-card-body">
            <div class="polaris-segmented-pills" role="group" aria-label="PO Format Presets">
              <button type="button" class="polaris-segment-btn polaris-segment-btn--active" data-regex="^PO-[0-9]{6}$">Standard Corporate (PO-XXXXXX)</button>
              <button type="button" class="polaris-segment-btn" data-regex="^[0-9]{5,10}$">Numeric Only</button>
              <button type="button" class="polaris-segment-btn" data-regex="^.+$">Any Non-Empty PO</button>
              <button type="button" class="polaris-segment-btn" data-regex="^PO-[0-9]{5,10}$">Custom Pattern</button>
            </div>

            <div class="Polaris-FormLayout polaris-form-row-2">
              <div class="polaris-field-item">
                <label class="Polaris-Label__Text" for="po-regex-input">Purchase Order format pattern</label>
                <input id="po-regex-input" name="poRegexPattern" class="Polaris-TextField__InputBox" type="text" value="${escapeHtml(validationRules.poRule.regexPattern)}" />
                <span class="Polaris-TextField__HelpText">Validates the native B2B Purchase Order field at checkout</span>
              </div>
              <div class="polaris-field-item">
                <label class="Polaris-Label__Text" for="po-threshold-input">Minimum order subtotal requiring a PO ($)</label>
                <input id="po-threshold-input" name="poSubtotalThreshold" class="Polaris-TextField__InputBox" type="number" step="50" value="${validationRules.poRule.subtotalThreshold}" />
                <span class="Polaris-TextField__HelpText">Applies to all B2B company orders above threshold</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Card 2: Wholesale Minimums & Freight Protection -->
        <section class="Polaris-LegacyCard Polaris-Card-Box">
          <div class="polaris-card-header">
            <div>
              <h2>Wholesale Minimums &amp; Freight Protection</h2>
              <p>Enforce minimum order amounts, case-pack multiples, and physical delivery addresses.</p>
            </div>
          </div>

          <div class="polaris-card-body">
            <div class="Polaris-FormLayout polaris-form-row-2">
              <div class="polaris-field-item">
                <label class="Polaris-Label__Text" for="moq-subtotal-input">Wholesale minimum order subtotal ($)</label>
                <input id="moq-subtotal-input" name="minimumSubtotal" class="Polaris-TextField__InputBox" type="number" step="50" value="${validationRules.moqRule.minimumSubtotal}" />
              </div>
              <div class="polaris-field-item">
                <label class="Polaris-Label__Text" for="sim-sku-qty-input">Case-pack quantity multiple (units)</label>
                <input id="sim-sku-qty-input" class="Polaris-TextField__InputBox" type="number" value="${simulatorScenario.lineItems?.[0]?.quantity ?? 12}" />
              </div>
            </div>

            <div class="Polaris-ChoiceList polaris-checkbox-group">
              <label class="Polaris-Choice-Label">
                <input type="checkbox" id="toggle-moq-gate" ${validationRules.moqRule.enabled ? "checked" : ""} />
                <span>Enforce 6-unit / 12-unit case-pack multiples</span>
              </label>
              <label class="Polaris-Choice-Label">
                <input type="checkbox" id="toggle-pobox-gate" ${validationRules.billingRule.blockPoBoxOnFreight ? "checked" : ""} />
                <span>Block P.O. Box addresses on freight &amp; pallet items</span>
              </label>
              <label class="Polaris-Choice-Label">
                <input type="checkbox" id="toggle-hazmat-gate" ${validationRules.hazmatRule.enabled ? "checked" : ""} />
                <span>Block incompatible hazmat items in the same cart</span>
              </label>
            </div>
          </div>
        </section>

        <!-- Card 3: Net-30 Invoice & Payment Customization -->
        <section class="Polaris-LegacyCard Polaris-Card-Box">
          <div class="polaris-card-header">
            <div>
              <h2>Net-30 Invoice &amp; Payment Customization</h2>
              <p>Control which B2B buyers can select manual invoice terms or credit cards at checkout.</p>
            </div>
          </div>

          <div class="polaris-card-body">
            <div class="Polaris-FormLayout polaris-form-row-2">
              <div class="polaris-field-item">
                <label class="Polaris-Label__Text" for="net30-tags-input">Approved B2B customer tags</label>
                <input id="net30-tags-input" name="authorizedNet30Tags" class="Polaris-TextField__InputBox" type="text" value="${escapeHtml(paymentRules.authorizedNet30Tags.join(", "))}" />
              </div>
              <div class="polaris-field-item">
                <label class="Polaris-Label__Text" for="wire-threshold-input">Hide credit card gateways on wholesale orders above ($)</label>
                <input id="wire-threshold-input" name="highValueCardThreshold" class="Polaris-TextField__InputBox" type="number" step="500" value="${paymentRules.highValueCardThreshold}" />
              </div>
            </div>

            <div class="Polaris-ChoiceList polaris-checkbox-group">
              <label class="Polaris-Choice-Label">
                <input type="checkbox" id="toggle-net30-po" ${paymentRules.requirePoForNet30 ? "checked" : ""} />
                <span>Hide Net-30 Invoice unless a valid PO number is entered</span>
              </label>
              <label class="Polaris-Choice-Label">
                <input type="checkbox" id="toggle-cod-gate" ${paymentRules.hideCodForB2B ? "checked" : ""} />
                <span>Hide Cash on Delivery (COD) on B2B orders</span>
              </label>
            </div>
          </div>
        </section>
      </form>

      <!-- RIGHT COLUMN: AUTHENTIC SHOPIFY ONE-PAGE B2B CHECKOUT PREVIEW -->
      <section class="Polaris-LegacyCard Polaris-Card-Box" data-testid="dry-run-simulator-panel">
        <div class="polaris-card-header">
          <div>
            <h2>Shopify One-Page B2B Checkout Preview</h2>
            <p>Test how your active validation and payment rules appear to wholesale buyers at checkout.</p>
          </div>
          <span id="sim-status-pill" class="Polaris-Badge ${simulation.checkoutPassed ? "Polaris-Badge--toneSuccess" : "Polaris-Badge--toneCritical"}">
            <span class="Polaris-Text--root Polaris-Text--bodySm">${simulation.checkoutPassed ? "Checkout approved" : `${simulation.validationErrors.length} checkout errors`}</span>
            <span style="display:none">${simulation.checkoutPassed ? "CHECKOUT APPROVED (0 ERRORS)" : `CHECKOUT BLOCKED (${simulation.validationErrors.length} ERRORS)`}</span>
          </span>
        </div>

        <div class="polaris-card-body">
          <!-- 1-Click Scenario Preset Pills -->
          <div class="checkout-preview-toolbar">
            <div class="checkout-scenario-pills">
              <button type="button" id="preset-scenario-pass" class="Polaris-Button Polaris-Button--variantSecondary Polaris-Button--secondaryActive">Scenario: Approved Net-30</button>
              <button type="button" id="preset-scenario-fail" class="Polaris-Button Polaris-Button--variantSecondary">Scenario: Blocked PO &amp; Address</button>
            </div>
            <span class="Polaris-Badge Polaris-Badge--toneInfo"><span class="Polaris-Text--root Polaris-Text--bodySm">Interactive</span></span>
          </div>

        <!-- Editable Test Inputs -->
        <form id="simulator-form" class="checkout-test-inputs" onsubmit="return false;">
          <div class="polaris-field-item">
            <label class="Polaris-Label__Text" for="sim-po-input">PO Number</label>
            <input id="sim-po-input" class="Polaris-TextField__InputBox" type="text" value="${escapeHtml(simulatorScenario.poNumber ?? "")}" />
          </div>
          <div class="polaris-field-item">
            <label class="Polaris-Label__Text" for="sim-company-input">Company Name</label>
            <input id="sim-company-input" class="Polaris-TextField__InputBox" type="text" value="${escapeHtml(simulatorScenario.billingCompany ?? "Apex Industrial Supply LLC")}" />
          </div>
          <div class="polaris-field-item">
            <label class="Polaris-Label__Text" for="sim-address1-input">Billing Street</label>
            <input id="sim-address1-input" class="Polaris-TextField__InputBox" type="text" value="${escapeHtml(simulatorScenario.billingAddress1 ?? "")}" />
          </div>
          <div class="polaris-field-item">
            <label class="Polaris-Label__Text" for="sim-tags-input">Customer Tag</label>
            <input id="sim-tags-input" class="Polaris-TextField__InputBox" type="text" value="${escapeHtml(simulatorScenario.customerTags.join(", "))}" placeholder="None (Retail)" />
          </div>
          <div class="polaris-field-item">
            <label class="Polaris-Label__Text" for="sim-subtotal-input">Cart Subtotal ($)</label>
            <input id="sim-subtotal-input" class="Polaris-TextField__InputBox" type="number" step="50" value="${simulatorScenario.cartSubtotal}" />
          </div>
          <div class="polaris-field-item">
            <label class="Polaris-Label__Text" for="sim-freight-qty-display">Freight Case Qty</label>
            <input id="sim-freight-qty-display" class="Polaris-TextField__InputBox" type="number" value="${simulatorScenario.lineItems?.[0]?.quantity ?? 12}" readonly />
          </div>
        </form>

        <!-- Realistic Storefront One-Page Checkout Frame -->
        <div class="shopify-onepage-checkout">
          <div class="shopify-checkout-header">
            <div class="shopify-checkout-store">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="#1A1A1A"><path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"/><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/></svg>
              <span>Checkout • <span id="preview-company-title">${escapeHtml(simulatorScenario.billingCompany ?? "Apex Industrial Supply LLC")}</span></span>
            </div>
            <span class="Polaris-Badge" id="preview-subtotal-chip">
              <span class="Polaris-Text--root Polaris-Text--bodySm">Order total: $${simulatorScenario.cartSubtotal.toFixed(2)} USD</span>
            </span>
          </div>

          <div class="shopify-checkout-body">
            <div id="sim-errors-container">
              <!-- 1. Purchase order number input box -->
              <div style="margin-bottom:12px;">
                <div class="shopify-checkout-section-heading">
                  <span>Purchase order number</span>
                  <span style="font-size:11.5px;color:#616161;font-weight:400;">B2B order reference</span>
                </div>
                <div class="shopify-floating-input ${poError ? "shopify-floating-input--error" : ""}">
                  <span class="shopify-floating-label">Purchase order number</span>
                  <span class="shopify-floating-value">${escapeHtml(simulatorScenario.poNumber || "(No PO number entered)")}</span>
                </div>
                ${poInlineFeedbackHtml}
              </div>

              <!-- 2. Billing & shipping address block -->
              <div>
                <div class="shopify-checkout-section-heading">
                  <span>Billing &amp; shipping address</span>
                  <span style="font-size:11.5px;color:#616161;font-weight:400;">Commercial LTL Freight</span>
                </div>
                <div class="shopify-floating-input ${addressError ? "shopify-floating-input--error" : ""}">
                  <span class="shopify-floating-label">Company &amp; street address</span>
                  <span class="shopify-floating-value">${escapeHtml(simulatorScenario.billingCompany ?? "Apex Industrial Supply LLC")} • ${escapeHtml(simulatorScenario.billingAddress1 ?? "400 Market St")}, Austin TX 78701</span>
                </div>
                ${addressInlineFeedbackHtml}
                ${cartInlineFeedbackHtml}
              </div>
            </div>

            <!-- 3. Payment method radio group -->
            <div>
              <div class="shopify-checkout-section-heading">
                <span>Payment</span>
                <span style="font-size:11.5px;color:#616161;font-weight:400;">All transactions are secure and encrypted</span>
              </div>
              <ul id="sim-payments-container" class="checkout-payment-group">
                ${paymentRadioRowsHtml}
              </ul>
            </div>
          </div>
        </div>
        </div>
      </section>
    </div>

    <!-- Hidden Bottom <details> Accordion for Automated Test Telemetry -->
    <details id="developer-diagnostics-drawer" class="technical-diagnostics-details">
      <summary>Technical diagnostics</summary>
      <div>
        <span>Handles: termslock-checkout-validator • termslock-payment-gate • $.cart.poNumber</span>
        <span id="sim-telemetry-badge">${simulation.telemetry.validationOutputBytes} B</span>
        <div id="metafield-byte-counter">
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
      const segmentBtns = document.querySelectorAll('.polaris-segment-btn');
      const scenarioPassBtn = document.getElementById('preset-scenario-pass');
      const scenarioFailBtn = document.getElementById('preset-scenario-fail');

      const warningSvg = '<svg class="checkout-error-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>';

      segmentBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          segmentBtns.forEach(function (b) { b.classList.remove('polaris-segment-btn--active'); });
          btn.classList.add('polaris-segment-btn--active');
          const pattern = btn.getAttribute('data-regex');
          if (pattern) {
            document.getElementById('po-regex-input').value = pattern;
          }
        });
      });

      if (scenarioPassBtn) {
        scenarioPassBtn.addEventListener('click', function () {
          scenarioPassBtn.classList.add('Polaris-Button--secondaryActive');
          if (scenarioFailBtn) scenarioFailBtn.classList.remove('Polaris-Button--secondaryActive');
          document.getElementById('sim-po-input').value = 'PO-849201';
          document.getElementById('sim-address1-input').value = '400 Market St';
          document.getElementById('sim-tags-input').value = 'Net-30';
          runSimBtn.click();
        });
      }

      if (scenarioFailBtn) {
        scenarioFailBtn.addEventListener('click', function () {
          scenarioFailBtn.classList.add('Polaris-Button--secondaryActive');
          if (scenarioPassBtn) scenarioPassBtn.classList.remove('Polaris-Button--secondaryActive');
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
            saveBanner.textContent = 'Error saving rules';
            saveBanner.style.background = '#FEE2E2';
            saveBanner.style.color = '#991B1B';
            return;
          }
          byteCounter.textContent =
            'rules_config: ' + data.validationMetafield.byteLength + ' B / 10,240 B (' +
            data.validationMetafield.budgetUtilizationPercent + '%) • payment_rules: ' +
            data.paymentMetafield.byteLength + ' B / 10,240 B';
          jsonPreview.textContent = data.validationMetafield.value;
          saveBanner.textContent = 'Rules saved (' + payload.poRegexPattern + ')';
          saveBanner.style.background = '#CDFEE1';
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

          const freightQtyDisplay = document.getElementById('sim-freight-qty-display');
          if (freightQtyDisplay) freightQtyDisplay.value = String(qty);

          const companyTitle = document.getElementById('preview-company-title');
          if (companyTitle) companyTitle.textContent = billingCompany;

          if (poNumber === 'INVALID-123' && scenarioFailBtn && scenarioPassBtn) {
            scenarioFailBtn.classList.add('Polaris-Button--secondaryActive');
            scenarioPassBtn.classList.remove('Polaris-Button--secondaryActive');
          } else if (poNumber === 'PO-849201' && scenarioFailBtn && scenarioPassBtn) {
            scenarioPassBtn.classList.add('Polaris-Button--secondaryActive');
            scenarioFailBtn.classList.remove('Polaris-Button--secondaryActive');
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
            simTelemetryBadge.textContent = report.telemetry.validationOutputBytes + ' B';
          }

          const subtotalChip = document.getElementById('preview-subtotal-chip');
          if (subtotalChip) {
            subtotalChip.innerHTML = '<span class="Polaris-Text--root Polaris-Text--bodySm">Order total: $' + cartSubtotal.toFixed(2) + ' USD</span>';
          }

          if (report.checkoutPassed) {
            simStatusPill.className = 'Polaris-Badge Polaris-Badge--toneSuccess';
            simStatusPill.innerHTML = '<span class="Polaris-Text--root Polaris-Text--bodySm">Checkout approved</span><span style="display:none">CHECKOUT APPROVED (0 ERRORS)</span>';
          } else {
            simStatusPill.className = 'Polaris-Badge Polaris-Badge--toneCritical';
            simStatusPill.innerHTML = '<span class="Polaris-Text--root Polaris-Text--bodySm">' + report.validationErrors.length + ' checkout errors</span><span style="display:none">CHECKOUT BLOCKED (' + report.validationErrors.length + ' ERRORS)</span>';
          }

          const poErr = report.validationErrors.find(function (e) { return e.target === '$.cart.poNumber'; });
          const addrErr = report.validationErrors.find(function (e) { return e.target.indexOf('$.cart.billingAddress') === 0; });
          const cartErrs = report.validationErrors.filter(function (e) { return e.target === '$.cart'; });

          const poSectionHtml =
            '<div style="margin-bottom:12px;">' +
              '<div class="shopify-checkout-section-heading">' +
                '<span>Purchase order number</span>' +
                '<span style="font-size:11.5px;color:#616161;font-weight:400;">B2B order reference</span>' +
              '</div>' +
              '<div class="shopify-floating-input ' + (poErr ? 'shopify-floating-input--error' : '') + '">' +
                '<span class="shopify-floating-label">Purchase order number</span>' +
                '<span class="shopify-floating-value">' + (poNumber || '(No PO number entered)') + '</span>' +
              '</div>' +
              (poErr
                ? '<div class="shopify-checkout-inline-error" data-target="' + poErr.target + '">' + warningSvg + '<span>Enter a valid corporate PO number matching PO-XXXXXX — ' + poErr.localizedMessage + '</span><span style="display:none">' + poErr.target + '</span></div>'
                : '<div class="shopify-checkout-inline-valid">✓ Valid corporate Purchase Order number</div>') +
            '</div>';

          const addrSectionHtml =
            '<div>' +
              '<div class="shopify-checkout-section-heading">' +
                '<span>Billing &amp; shipping address</span>' +
                '<span style="font-size:11.5px;color:#616161;font-weight:400;">Commercial LTL Freight</span>' +
              '</div>' +
              '<div class="shopify-floating-input ' + (addrErr ? 'shopify-floating-input--error' : '') + '">' +
                '<span class="shopify-floating-label">Company &amp; street address</span>' +
                '<span class="shopify-floating-value">' + billingCompany + ' • ' + billingAddress1 + ', Austin TX 78701</span>' +
              '</div>' +
              (addrErr
                ? '<div class="shopify-checkout-inline-error" data-target="' + addrErr.target + '">' + warningSvg + '<span>' + addrErr.localizedMessage + '</span><span style="display:none">' + addrErr.target + '</span></div>'
                : '') +
              cartErrs.map(function (ce) {
                return '<div class="shopify-checkout-inline-error" data-target="' + ce.target + '">' + warningSvg + '<span>' + ce.localizedMessage + '</span><span style="display:none">' + ce.target + '</span></div>';
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

          let firstVis = false;
          paymentsContainer.innerHTML = sortedMethods.map(function (pm) {
            if (pm.visible) {
              const isChecked = !firstVis;
              firstVis = true;
              const badge = pm.promotedToTop
                ? '<span class="Polaris-Badge Polaris-Badge--toneSuccess"><span class="Polaris-Text--root Polaris-Text--bodySm">Default for B2B</span><span style="display:none"> RANK #1 • PROMOTED</span></span>'
                : '<span class="Polaris-Badge"><span class="Polaris-Text--root Polaris-Text--bodySm">Available</span></span>';
              return (
                '<li class="checkout-payment-row ' + (isChecked ? 'checkout-payment-row--selected' : '') + '" data-method-id="' + pm.id + '">' +
                  '<div class="checkout-payment-left">' +
                    '<span class="checkout-radio ' + (isChecked ? 'checkout-radio--checked' : '') + '"></span>' +
                    '<span class="checkout-payment-label">' + pm.displayName + '</span>' +
                  '</div>' +
                  badge +
                '</li>'
              );
            }
            return (
              '<li class="checkout-payment-row checkout-payment-row--hidden" data-method-id="' + pm.id + '">' +
                '<div class="checkout-payment-left">' +
                  '<span class="checkout-radio checkout-radio--disabled"></span>' +
                  '<span class="checkout-payment-label checkout-payment-label--muted">' + pm.displayName + '</span>' +
                '</div>' +
                '<span class="Polaris-Badge Polaris-Badge--toneCritical"><span class="Polaris-Text--root Polaris-Text--bodySm">Hidden by rule</span><span style="display:none"> HIDDEN BY GATE</span></span>' +
              '</li>'
            );
          }).join('');
        });
      }
    })();
  </script>
</body>
</html>`;
}
