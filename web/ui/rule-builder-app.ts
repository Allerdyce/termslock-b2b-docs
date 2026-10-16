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
  billingCompany: "Apex Industrial Supply LLC (VAT-883920)",
  billingAddress1: "450 Commerce Pkwy",
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
 * Renders the full interactive TermsLock Embedded Admin Rule Builder & Dry-Run Checkout Simulator HTML application.
 * Includes Shopify App Bridge v4 meta tags, Polaris design system styling, Onest typography,
 * interactive form controls, and live client-side fetch() bindings to /api/rules and /api/simulate.
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

  const errorBadgesHtml =
    simulation.validationErrors.length === 0
      ? `<div class="polaris-banner polaris-banner--success" id="sim-validation-banner">
           <div class="banner-title">✓ Checkout Validation Passed (0 Errors)</div>
           <div class="banner-body">All 4 B2B validation gates cleared for targets <code>$.cart.poNumber</code>, <code>$.cart.billingAddress.*</code>, and <code>$.cart</code>.</div>
         </div>`
      : simulation.validationErrors
          .map(
            (err) =>
              `<div class="polaris-banner polaris-banner--critical sim-error-item" data-target="${escapeHtml(err.target)}">
                 <div class="banner-target"><code>target: "${escapeHtml(err.target)}"</code></div>
                 <div class="banner-body">${escapeHtml(err.localizedMessage)}</div>
               </div>`
          )
          .join("\n");

  const sortedPreview = [...simulation.paymentMethodsPreview].sort((a, b) => {
    if (a.promotedToTop && !b.promotedToTop) return -1;
    if (!a.promotedToTop && b.promotedToTop) return 1;
    if (a.visible && !b.visible) return -1;
    if (!a.visible && b.visible) return 1;
    return 0;
  });

  let visibleRank = 0;
  const paymentMethodsHtml = sortedPreview
    .map((pm) => {
      if (pm.visible) visibleRank += 1;
      const badgeLabel = pm.visible
        ? pm.promotedToTop
          ? `RANK #1 • PROMOTED`
          : `RANK #${visibleRank} • VISIBLE`
        : "HIDDEN BY GATE";
      const badgeClass = pm.visible
        ? pm.promotedToTop
          ? "polaris-badge--promoted"
          : "polaris-badge--success"
        : "polaris-badge--critical";
      return `<li class="payment-item ${pm.visible ? (pm.promotedToTop ? "payment-item--promoted" : "payment-item--visible") : "payment-item--hidden"}" data-method-id="${escapeHtml(pm.id)}">
           <span class="payment-name">${escapeHtml(pm.displayName)}</span>
           <span class="polaris-badge ${badgeClass}">${badgeLabel}</span>
         </li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Shopify App Bridge v4 Meta Configuration -->
  <meta name="shopify-api-key" content="com.evidencepair.shopify.termslock" />
  <meta name="shopify-app-Version" content="2026-10" />
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" defer></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Onest:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <title>TermsLock — B2B PO, Tax &amp; Net-30 Checkout Rules (API 2026-10)</title>
  <style>
    :root {
      --p-color-bg-surface: #ffffff;
      --p-color-bg-app: #f1f2f4;
      --p-color-text: #1a1c1d;
      --p-color-text-subdued: #5c5f62;
      --p-color-border: #d4d7d9;
      --p-color-interactive: #008060;
      --p-color-interactive-hover: #006e52;
      --p-color-critical: #d82c0d;
      --p-color-critical-bg: #fff4f4;
      --p-color-success: #007f5f;
      --p-color-success-bg: #eef9f5;
      --p-font-family-sans: 'Onest', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
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
      padding: 18px 28px;
      min-height: 100vh;
    }
    .polaris-page {
      max-width: 1544px;
      margin: 0 auto;
    }
    .polaris-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0b241c;
      color: #ffffff;
      padding: 16px 24px;
      border-radius: 14px;
      margin-bottom: 16px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    }
    .polaris-header h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.4px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .polaris-header p {
      font-size: 13px;
      color: #a7f3d0;
      margin-top: 3px;
    }
    .polaris-header code {
      font-family: var(--p-font-family-mono);
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
      padding: 2px 6px;
      border-radius: 5px;
    }
    .header-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .plan-select {
      background: #11382b;
      color: #ecfdf5;
      border: 1.5px solid #34d399;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: var(--p-font-family-sans);
      font-size: 13px;
      font-weight: 700;
    }
    .wasm-pill {
      background: #059669;
      color: #ffffff;
      font-family: var(--p-font-family-mono);
      font-size: 12px;
      font-weight: 700;
      padding: 8px 12px;
      border-radius: 8px;
    }
    .polaris-grid {
      display: grid;
      grid-template-columns: 750px 766px;
      gap: 20px;
      align-items: start;
    }
    .polaris-card {
      background: var(--p-color-bg-surface);
      border: 1px solid var(--p-color-border);
      border-radius: 14px;
      padding: 20px 22px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1.5px solid #e5e7eb;
      margin-bottom: 14px;
    }
    .card-header h2 {
      font-size: 18px;
      font-weight: 800;
      color: #111827;
    }
    .handle-tag {
      font-family: var(--p-font-family-mono);
      font-size: 11px;
      font-weight: 700;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #6ee7b7;
      padding: 4px 9px;
      border-radius: 6px;
    }
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .form-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-field label {
      font-size: 12px;
      font-weight: 700;
      color: #374151;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .form-field label code {
      font-family: var(--p-font-family-mono);
      font-size: 11px;
      color: #059669;
    }
    .polaris-input {
      width: 100%;
      padding: 8px 11px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-family: var(--p-font-family-mono);
      font-size: 13px;
      font-weight: 600;
      color: #111827;
      background: #f8fafc;
    }
    .polaris-input:focus {
      outline: none;
      border-color: var(--p-color-interactive);
      background: #ffffff;
    }
    .checkbox-row {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 9px 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 12px;
      font-weight: 700;
      color: #1f2937;
    }
    .checkbox-row label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .btn-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      margin-bottom: 12px;
    }
    .polaris-btn {
      background: var(--p-color-interactive);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-family: var(--p-font-family-sans);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .polaris-btn:hover {
      background: var(--p-color-interactive-hover);
    }
    .polaris-btn--secondary {
      background: #0f172a;
    }
    .polaris-btn--secondary:hover {
      background: #1e293b;
    }
    .metafield-box {
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      font-family: var(--p-font-family-mono);
      font-size: 11.5px;
    }
    .metafield-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #34d399;
      font-weight: 700;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .metafield-pre {
      max-height: 112px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      color: #cbd5e1;
      line-height: 1.35;
    }
    .polaris-banner {
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 13px;
    }
    .polaris-banner--critical {
      background: var(--p-color-critical-bg);
      border-left: 4px solid var(--p-color-critical);
      border-top: 1px solid #fecaca;
      border-right: 1px solid #fecaca;
      border-bottom: 1px solid #fecaca;
      color: #991b1b;
    }
    .polaris-banner--success {
      background: var(--p-color-success-bg);
      border-left: 4px solid var(--p-color-success);
      border-top: 1px solid #a7f3d0;
      border-right: 1px solid #a7f3d0;
      border-bottom: 1px solid #a7f3d0;
      color: #065f46;
    }
    .banner-title {
      font-weight: 800;
      font-size: 13.5px;
    }
    .banner-target code {
      background: #991b1b;
      color: #ffffff;
      font-family: var(--p-font-family-mono);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .banner-body {
      font-weight: 600;
      line-height: 1.35;
    }
    .section-subtitle {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #4b5563;
      margin: 12px 0 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .payment-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .payment-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 13px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      border: 1.5px solid #e5e7eb;
    }
    .payment-item--promoted {
      background: #ecfdf5;
      border-color: #10b981;
      color: #065f46;
    }
    .payment-item--visible {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #1e293b;
    }
    .payment-item--hidden {
      background: #fff1f2;
      border-color: #fda4af;
      color: #9f1239;
      text-decoration: line-through;
    }
    .polaris-badge {
      font-family: var(--p-font-family-mono);
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 5px;
    }
    .polaris-badge--promoted {
      background: #059669;
      color: #ffffff;
    }
    .polaris-badge--success {
      background: #e2e8f0;
      color: #1e293b;
    }
    .polaris-badge--critical {
      background: #e11d48;
      color: #ffffff;
      text-decoration: none;
    }
    .save-toast {
      font-size: 12.5px;
      font-weight: 700;
      color: #047857;
      background: #d1fae5;
      border: 1px solid #34d399;
      padding: 6px 12px;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <main class="polaris-page">
    <header class="polaris-header">
      <div>
        <h1>TermsLock: B2B PO, Tax &amp; Net-30 Checkout Rules</h1>
        <p>Shopify Functions API <code>2026-10</code> • Namespace: <code>$app:termslock</code> • Active Tier: <strong id="active-plan-label">${planSpec.name} ($${planSpec.amountUsd.toFixed(2)}/30d, 14-day Free Trial)</strong></p>
      </div>
      <div class="header-controls">
        <select id="plan-tier-select" class="plan-select" aria-label="Subscription Plan Tier">
          <option value="PLUS_ENTERPRISE" ${activePlan === "PLUS_ENTERPRISE" ? "selected" : ""}>Plus &amp; Enterprise Plan ($99/30d)</option>
          <option value="B2B_STANDARD" ${activePlan === "B2B_STANDARD" ? "selected" : ""}>B2B Standard Plan ($39/30d)</option>
        </select>
        <span class="wasm-pill">Wasm Neutral • 0 Node Globals</span>
      </div>
    </header>

    <section class="polaris-grid">
      <!-- LEFT PANEL: MERCHANT RULE BUILDER & METAFIELD COMPILER -->
      <article class="polaris-card" data-testid="rule-builder-panel">
        <div class="card-header">
          <h2>B2B Checkout &amp; Payment Governance Rule Builder</h2>
          <span class="handle-tag">termslock-checkout-validator • termslock-payment-gate</span>
        </div>

        <form id="rule-builder-form" onsubmit="return false;">
          <div class="form-grid-2">
            <div class="form-field">
              <label for="po-regex-input">PO Number Regex Pattern <code>$.cart.poNumber</code></label>
              <input id="po-regex-input" name="poRegexPattern" class="polaris-input" type="text" value="${escapeHtml(validationRules.poRule.regexPattern)}" />
            </div>
            <div class="form-field">
              <label for="po-threshold-input">PO Required Subtotal Threshold ($) <code>≥ USD</code></label>
              <input id="po-threshold-input" name="poSubtotalThreshold" class="polaris-input" type="number" step="50" value="${validationRules.poRule.subtotalThreshold}" />
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-field">
              <label for="moq-subtotal-input">Wholesale MOQ ($) <code>$.cart</code></label>
              <input id="moq-subtotal-input" name="minimumSubtotal" class="polaris-input" type="number" step="50" value="${validationRules.moqRule.minimumSubtotal}" />
            </div>
            <div class="form-field">
              <label for="net30-tags-input">Net-30 Authorized Tags</label>
              <input id="net30-tags-input" name="authorizedNet30Tags" class="polaris-input" type="text" value="${escapeHtml(paymentRules.authorizedNet30Tags.join(", "))}" />
            </div>
            <div class="form-field">
              <label for="wire-threshold-input">Hide Cards Above ($)</label>
              <input id="wire-threshold-input" name="highValueCardThreshold" class="polaris-input" type="number" step="500" value="${paymentRules.highValueCardThreshold}" />
            </div>
          </div>

          <div class="checkbox-row">
            <label><input type="checkbox" id="toggle-po-gate" ${validationRules.poRule.enabled ? "checked" : ""} /> Gate 1: Require PO Format</label>
            <label><input type="checkbox" id="toggle-pobox-gate" ${validationRules.billingRule.blockPoBoxOnFreight ? "checked" : ""} /> Gate 2: Block Freight P.O. Box</label>
            <label><input type="checkbox" id="toggle-moq-gate" ${validationRules.moqRule.enabled ? "checked" : ""} /> Gate 3: MOQ &amp; 6x/12x Case-Pack</label>
            <label><input type="checkbox" id="toggle-hazmat-gate" ${validationRules.hazmatRule.enabled ? "checked" : ""} /> Gate 4: Hazmat Matrix</label>
          </div>

          <div class="btn-row">
            <button type="button" id="save-rules-btn" class="polaris-btn">Save &amp; Compile Rules</button>
            <span id="rules-save-banner" class="save-toast">Compiled &amp; Synced to $app:termslock (&lt;10 KB Verified)</span>
          </div>
        </form>

        <div class="metafield-box">
          <div class="metafield-header">
            <span>Compiled: <code>$app:termslock</code></span>
            <span id="metafield-byte-counter">rules_config: ${compiledVal.byteLength} B / 10,240 B (${compiledVal.budgetUtilizationPercent}%) • payment_rules: ${compiledPay.byteLength} B / 10,240 B</span>
          </div>
          <pre id="metafield-json-preview" class="metafield-pre">${escapeHtml(compiledVal.value)}</pre>
        </div>
      </article>

      <!-- RIGHT PANEL: INTERACTIVE DRY-RUN CHECKOUT SIMULATOR -->
      <article class="polaris-card" data-testid="dry-run-simulator-panel">
        <div class="card-header">
          <h2>Interactive Dry-Run Checkout Simulator</h2>
          <span class="handle-tag" id="sim-telemetry-badge">Output: ${simulation.telemetry.validationOutputBytes} B / 20,480 B • 0 External Calls</span>
        </div>

        <form id="simulator-form" onsubmit="return false;">
          <div class="form-grid-3">
            <div class="form-field">
              <label for="sim-po-input">PO Number <code>cart.poNumber</code></label>
              <input id="sim-po-input" class="polaris-input" type="text" value="${escapeHtml(simulatorScenario.poNumber ?? "")}" placeholder="e.g. PO-849201" />
            </div>
            <div class="form-field">
              <label for="sim-tags-input">Customer Tags</label>
              <input id="sim-tags-input" class="polaris-input" type="text" value="${escapeHtml(simulatorScenario.customerTags.join(", "))}" placeholder="e.g. Net-30, B2B" />
            </div>
            <div class="form-field">
              <label for="sim-subtotal-input">Cart Subtotal ($ USD)</label>
              <input id="sim-subtotal-input" class="polaris-input" type="number" step="50" value="${simulatorScenario.cartSubtotal}" />
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-field">
              <label for="sim-address1-input">Billing Street <code>address1</code></label>
              <input id="sim-address1-input" class="polaris-input" type="text" value="${escapeHtml(simulatorScenario.billingAddress1 ?? "")}" />
            </div>
            <div class="form-field">
              <label for="sim-company-input">Billing Company <code>company</code></label>
              <input id="sim-company-input" class="polaris-input" type="text" value="${escapeHtml(simulatorScenario.billingCompany ?? "")}" />
            </div>
            <div class="form-field">
              <label for="sim-sku-qty-input">Freight Case-6 Qty (SKU)</label>
              <input id="sim-sku-qty-input" class="polaris-input" type="number" value="${simulatorScenario.lineItems?.[0]?.quantity ?? 12}" />
            </div>
          </div>

          <div class="btn-row" style="margin-top:6px;margin-bottom:10px;">
            <button type="button" id="run-simulator-btn" class="polaris-btn polaris-btn--secondary">Run Checkout Simulation</button>
            <span id="sim-status-pill" class="polaris-badge ${simulation.checkoutPassed ? "polaris-badge--promoted" : "polaris-badge--critical"}">
              ${simulation.checkoutPassed ? "CHECKOUT APPROVED (0 ERRORS)" : `CHECKOUT BLOCKED (${simulation.validationErrors.length} ERRORS)`}
            </span>
          </div>
        </form>

        <div class="section-subtitle">
          <span>1. Checkout Validation Function Output (purchase.cart-checkout-validation.run)</span>
        </div>
        <div id="sim-errors-container">
          ${errorBadgesHtml}
        </div>

        <div class="section-subtitle">
          <span>2. Payment Method Customization Output (purchase.payment-customization.run)</span>
        </div>
        <ul id="sim-payments-container" class="payment-list">
          ${paymentMethodsHtml}
        </ul>
      </article>
    </section>
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
            saveBanner.textContent = 'Error: ' + (data.error || 'Compilation failed');
            saveBanner.style.background = '#fee2e2';
            saveBanner.style.color = '#991b1b';
            return;
          }
          byteCounter.textContent =
            'rules_config: ' + data.validationMetafield.byteLength + ' B / 10,240 B (' +
            data.validationMetafield.budgetUtilizationPercent + '%) • payment_rules: ' +
            data.paymentMetafield.byteLength + ' B / 10,240 B';
          jsonPreview.textContent = data.validationMetafield.value;
          saveBanner.textContent =
            'Saved & Compiled (' + data.validationMetafield.byteLength + ' B < 10 KB ceiling • Regex: ' +
            payload.poRegexPattern + ')';
          saveBanner.style.background = '#d1fae5';
          saveBanner.style.color = '#047857';
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
          const billingCompany = document.getElementById('sim-company-input').value;
          const qty = parseInt(document.getElementById('sim-sku-qty-input').value, 10) || 12;

          const res = await fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cartSubtotal: cartSubtotal,
              customerTags: customerTags,
              purchasingCompanyName: billingCompany || 'Apex Industrial Supply LLC',
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

          simTelemetryBadge.textContent =
            'Output: ' + report.telemetry.validationOutputBytes + ' B / 20,480 B • 0 External Calls';

          if (report.checkoutPassed) {
            simStatusPill.className = 'polaris-badge polaris-badge--promoted';
            simStatusPill.textContent = 'CHECKOUT APPROVED (0 ERRORS)';
            errorsContainer.innerHTML =
              '<div class="polaris-banner polaris-banner--success" id="sim-validation-banner">' +
              '<div class="banner-title">✓ Checkout Validation Passed (0 Errors)</div>' +
              '<div class="banner-body">All 4 B2B validation gates cleared for targets <code>$.cart.poNumber</code>, <code>$.cart.billingAddress.*</code>, and <code>$.cart</code>.</div>' +
              '</div>';
          } else {
            simStatusPill.className = 'polaris-badge polaris-badge--critical';
            simStatusPill.textContent = 'CHECKOUT BLOCKED (' + report.validationErrors.length + ' ERRORS)';
            errorsContainer.innerHTML = report.validationErrors
              .map(function (err) {
                return (
                  '<div class="polaris-banner polaris-banner--critical sim-error-item" data-target="' + err.target + '">' +
                  '<div class="banner-target"><code>target: "' + err.target + '"</code></div>' +
                  '<div class="banner-body">' + err.localizedMessage + '</div>' +
                  '</div>'
                );
              })
              .join('');
          }

          const sortedMethods = report.paymentMethodsPreview.slice().sort(function (a, b) {
            if (a.promotedToTop && !b.promotedToTop) return -1;
            if (!a.promotedToTop && b.promotedToTop) return 1;
            if (a.visible && !b.visible) return -1;
            if (!a.visible && b.visible) return 1;
            return 0;
          });

          let rank = 0;
          paymentsContainer.innerHTML = sortedMethods
            .map(function (pm) {
              if (pm.visible) rank += 1;
              const badgeLabel = pm.visible
                ? (pm.promotedToTop ? 'RANK #1 • PROMOTED' : 'RANK #' + rank + ' • VISIBLE')
                : 'HIDDEN BY GATE';
              const badgeClass = pm.visible
                ? (pm.promotedToTop ? 'polaris-badge--promoted' : 'polaris-badge--success')
                : 'polaris-badge--critical';
              const itemClass = pm.visible
                ? (pm.promotedToTop ? 'payment-item--promoted' : 'payment-item--visible')
                : 'payment-item--hidden';
              return (
                '<li class="payment-item ' + itemClass + '" data-method-id="' + pm.id + '">' +
                '<span class="payment-name">' + pm.displayName + '</span>' +
                '<span class="polaris-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
                '</li>'
              );
            })
            .join('');
        });
      }
    })();
  </script>
</body>
</html>`;
}
