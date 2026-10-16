import React from "react";
import ReactDOMServer from "react-dom/server";
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
import { AdminHostShell } from "./AdminHostShell.ts";
import { RuleBuilderPage } from "./RuleBuilderPage.ts";

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
 * Renders the embedded Shopify Admin UI using genuine @shopify/polaris React components
 * inside an authentic Shopify Admin Host Shell (TopBar + Left Sidebar + Contextual Save Bar).
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

  // Render the real @shopify/polaris React component tree + Admin Host Shell via ReactDOMServer
  const reactAppHtml = ReactDOMServer.renderToString(
    React.createElement(
      AdminHostShell,
      {
        storeName: "Apex Industrial B2B",
        activeAppName: "TermsLock B2B Rules",
        planName: planSpec.name
      },
      React.createElement(RuleBuilderPage, {
        validationRules,
        paymentRules,
        simulatorScenario,
        simulation,
        compiledVal,
        compiledPay,
        planName: planSpec.name
      })
    )
  );

  return `<!DOCTYPE html>
<html lang="en" class="p-theme-light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Shopify App Bridge v4 Embedded Configuration -->
  <meta name="shopify-api-key" content="com.evidencepair.shopify.termslock" />
  <meta name="shopify-app-version" content="2026-10" />
  <!-- Active Plan: ${planSpec.name} -->
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
      min-height: 100vh;
    }

    /* AUTHENTIC SHOPIFY ADMIN HOST SHELL */
    .shopify-admin-host-frame {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: #F1F1F1;
    }
    /* 1. TOP DARK ADMIN BAR (48px, #1A1A1A) */
    .shopify-host-topbar {
      height: 48px;
      background: #1A1A1A;
      color: #E3E3E3;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      position: sticky;
      top: 0;
      z-index: 1000;
      border-bottom: 1px solid #2B2B2B;
    }
    .shopify-host-topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .shopify-host-logo-wrapper {
      display: flex;
      align-items: center;
      color: #999999;
    }
    .shopify-host-store-switcher {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.06);
    }
    .shopify-host-store-switcher:hover {
      background: rgba(255, 255, 255, 0.12);
    }
    .shopify-host-plan-badge {
      font-size: 11px;
      font-weight: 600;
      background: rgba(0, 128, 96, 0.35);
      color: #A3E6CD;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.2px;
    }
    .shopify-host-topbar-center {
      flex: 1;
      max-width: 480px;
      margin: 0 20px;
    }
    .shopify-host-search-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #2B2B2B;
      border: 1px solid #383838;
      border-radius: 8px;
      padding: 5px 12px;
      color: #8C8C8C;
      font-size: 13px;
      cursor: pointer;
    }
    .shopify-host-search-placeholder {
      flex: 1;
    }
    .shopify-host-search-kbd {
      font-size: 11px;
      background: #3B3B3B;
      color: #D4D4D4;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #4D4D4D;
      font-family: monospace;
    }
    .shopify-host-topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .shopify-host-icon-btn {
      color: #A6A6A6;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 6px;
      border-radius: 6px;
    }
    .shopify-host-icon-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
    }
    .shopify-host-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #4A4A4A;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
    }
    .shopify-host-avatar-status {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #008060;
      border: 1.5px solid #1A1A1A;
    }

    /* 2. BODY LAYOUT: SIDEBAR + MAIN VIEWPORT */
    .shopify-host-body {
      display: flex;
      flex: 1;
    }
    .shopify-host-sidebar {
      width: 240px;
      background: #EBEBEB;
      border-right: 1px solid #DEDEDE;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      flex-shrink: 0;
      padding: 12px 8px;
    }
    .shopify-host-nav-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .shopify-host-nav-heading {
      font-size: 11px;
      font-weight: 600;
      color: #6D7175;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 10px 4px 10px;
    }
    .shopify-host-nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 10px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: #303030;
      cursor: pointer;
      transition: background 0.15s ease;
      position: relative;
    }
    .shopify-host-nav-item:hover {
      background: rgba(0, 0, 0, 0.04);
    }
    .shopify-host-nav-item--b2b .shopify-host-b2b-pill {
      margin-left: auto;
      font-size: 10px;
      font-weight: 700;
      background: #E3E3E3;
      color: #4A4A4A;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .shopify-host-nav-item--active {
      background: #FFFFFF !important;
      font-weight: 650;
      color: #1A1A1A;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    }
    .shopify-host-nav-item--active .shopify-host-active-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #008060;
      margin-left: auto;
    }
    .shopify-host-nav-divider {
      height: 1px;
      background: #DCDCDC;
      margin: 8px 6px;
    }
    .shopify-host-sidebar-footer {
      border-top: 1px solid #DCDCDC;
      padding-top: 8px;
    }

    /* 3. MAIN EMBEDDED CONTENT WRAPPER */
    .shopify-host-main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      background: #F1F1F1;
    }
    /* Contextual Save Bar */
    .shopify-host-save-bar {
      height: 48px;
      background: #1A1A1A;
      color: #FFFFFF;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #303030;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0,0,0,0.12);
    }
    .shopify-host-save-bar-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 500;
      color: #E3E3E3;
    }
    .shopify-host-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #008060;
      display: inline-block;
    }
    .shopify-host-save-bar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .shopify-host-save-toast {
      font-size: 12px;
      font-weight: 500;
      color: #0C5132;
      background: #CDFEE1;
      padding: 4px 10px;
      border-radius: 6px;
      transition: all 0.2s ease;
      display: inline-block;
    }
    .shopify-host-discard-btn {
      background: transparent;
      color: #E3E3E3;
      border: 1px solid #4A4A4A;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
    }
    .shopify-host-discard-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .shopify-host-save-btn {
      background: #008060;
      color: #FFFFFF;
      border: 1px solid #008060;
      border-radius: 6px;
      padding: 5px 14px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
    }
    .shopify-host-save-btn:hover {
      background: #006e52;
    }
    .shopify-host-app-viewport {
      padding: 20px 24px 40px 24px;
    }

    /* Polaris Presets ButtonGroup */
    .polaris-preset-btngroup {
      margin-top: 4px;
      margin-bottom: 4px;
    }

    /* Realistic Storefront One-Page Checkout Mini-Frame */
    .shopify-onepage-checkout {
      background: #FFFFFF;
      border: 1px solid #DEDEDE;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .shopify-checkout-header {
      background: #FAFAFA;
      border-bottom: 1px solid #EAEAEA;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .shopify-checkout-store {
      font-size: 13px;
      font-weight: 650;
      color: #1A1A1A;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .shopify-checkout-body {
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .shopify-checkout-section-heading {
      font-size: 12px;
      font-weight: 650;
      color: #1A1A1A;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .shopify-floating-input {
      background: #FFFFFF;
      border: 1px solid #DEDEDE;
      border-radius: 6px;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .shopify-floating-input--error {
      border: 1.5px solid #D82C0D;
      background: #FFFDFD;
    }
    .shopify-floating-label {
      font-size: 10px;
      color: #707070;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .shopify-floating-value {
      font-size: 12.5px;
      font-weight: 500;
      color: #1A1A1A;
    }
    .shopify-checkout-inline-error {
      margin-top: 5px;
      background: #FFF4F4;
      border: 1px solid #D82C0D;
      border-radius: 6px;
      padding: 5px 8px;
      color: #D82C0D;
      font-size: 11.5px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .checkout-error-svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: #D82C0D;
    }
    .shopify-checkout-inline-valid {
      margin-top: 4px;
      font-size: 11px;
      color: #007F5F;
      font-weight: 500;
    }
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
      padding: 8px 10px;
      border-bottom: 1px solid #EAEAEA;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
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
      gap: 8px;
    }
    .checkout-radio {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1.5px solid #8A8A8A;
      display: inline-block;
    }
    .checkout-radio--checked {
      border: 4.5px solid #1A1A1A;
    }
    .checkout-radio--disabled {
      border: 1.5px dashed #C4C4C4;
    }
    .checkout-payment-label {
      color: #1A1A1A;
      font-size: 12px;
    }
    .checkout-payment-label--muted {
      color: #8A8A8A;
      text-decoration: line-through;
    }

    /* Expandable test buyer inputs drawer */
    .simulator-custom-inputs-drawer {
      border: 1px solid #E3E3E3;
      border-radius: 8px;
      padding: 8px 12px;
      background: #FAFAFA;
      margin-top: 8px;
    }
    .simulator-custom-inputs-summary {
      font-size: 12px;
      font-weight: 500;
      color: #616161;
      cursor: pointer;
    }
    .checkout-test-inputs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 8px;
    }
    .checkout-test-inputs .Polaris-Label__Text {
      font-size: 10.5px;
      color: #616161;
      display: block;
      margin-bottom: 2px;
    }
    .checkout-test-inputs .Polaris-TextField__InputBox {
      padding: 4px 6px;
      font-size: 11.5px;
      border: 1px solid #8A8A8A;
      border-radius: 6px;
      width: 100%;
    }
    .technical-diagnostics-details {
      margin-top: 60px;
      font-size: 11px;
      color: #8A8A8A;
    }
  </style>
</head>
<body class="p-theme-light">
  <div id="root">${reactAppHtml}</div>

  <script>
    (function () {
      const saveBtn = document.getElementById('save-rules-btn');
      const pageSaveBtn = document.getElementById('page-save-rules-btn');
      const runSimBtn = document.getElementById('run-simulator-btn');
      const pageRunBtn = document.getElementById('page-run-sim-btn');
      const byteCounter = document.getElementById('metafield-byte-counter');
      const jsonPreview = document.getElementById('metafield-json-preview');
      const saveBanner = document.getElementById('rules-save-banner');
      const errorsContainer = document.getElementById('sim-errors-container');
      const paymentsContainer = document.getElementById('sim-payments-container');
      const simStatusPill = document.getElementById('sim-status-pill');
      const simTelemetryBadge = document.getElementById('sim-telemetry-badge');
      const presetBtns = document.querySelectorAll('.polaris-preset-btngroup button, .polaris-segment-btn');
      const scenarioPassBtn = document.getElementById('preset-scenario-pass');
      const scenarioFailBtn = document.getElementById('preset-scenario-fail');

      const warningSvg = '<svg class="checkout-error-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>';

      presetBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          presetBtns.forEach(function (b) { b.classList.remove('Polaris-Button--pressed'); });
          btn.classList.add('Polaris-Button--pressed');
          const pattern = btn.getAttribute('data-regex');
          if (pattern) {
            const input = document.getElementById('po-regex-input');
            if (input) input.value = pattern;
          }
        });
      });

      if (scenarioPassBtn) {
        scenarioPassBtn.addEventListener('click', function () {
          scenarioPassBtn.classList.add('Polaris-Button--pressed');
          if (scenarioFailBtn) scenarioFailBtn.classList.remove('Polaris-Button--pressed');
          const poIn = document.getElementById('sim-po-input');
          const addrIn = document.getElementById('sim-address1-input');
          const tagIn = document.getElementById('sim-tags-input');
          if (poIn) poIn.value = 'PO-849201';
          if (addrIn) addrIn.value = '400 Market St';
          if (tagIn) tagIn.value = 'Net-30';
          if (runSimBtn) runSimBtn.click();
        });
      }

      if (scenarioFailBtn) {
        scenarioFailBtn.addEventListener('click', function () {
          scenarioFailBtn.classList.add('Polaris-Button--pressed');
          if (scenarioPassBtn) scenarioPassBtn.classList.remove('Polaris-Button--pressed');
          const poIn = document.getElementById('sim-po-input');
          const addrIn = document.getElementById('sim-address1-input');
          const tagIn = document.getElementById('sim-tags-input');
          if (poIn) poIn.value = 'INVALID-123';
          if (addrIn) addrIn.value = 'P.O. Box 409';
          if (tagIn) tagIn.value = '';
          if (runSimBtn) runSimBtn.click();
        });
      }

      function gatherRulesPayload() {
        const poRegexInput = document.getElementById('po-regex-input');
        const poRegex = poRegexInput ? poRegexInput.value.trim() : '^PO-[0-9]{6}$';
        const poThresholdInput = document.getElementById('po-threshold-input');
        const poThreshold = poThresholdInput ? parseFloat(poThresholdInput.value) || 1000 : 1000;
        const moqInput = document.getElementById('moq-subtotal-input');
        const moqSubtotal = moqInput ? parseFloat(moqInput.value) || 500 : 500;
        const tagInput = document.getElementById('net30-tags-input');
        const net30Tags = tagInput ? tagInput.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : ['Net-30'];
        const wireInput = document.getElementById('wire-threshold-input');
        const wireThreshold = wireInput ? parseFloat(wireInput.value) || 5000 : 5000;

        const togglePo = document.getElementById('toggle-po-gate');
        const togglePobox = document.getElementById('toggle-pobox-gate');
        const toggleMoq = document.getElementById('toggle-moq-gate');
        const toggleHazmat = document.getElementById('toggle-hazmat-gate');

        return {
          poRegexPattern: poRegex,
          poSubtotalThreshold: poThreshold,
          minimumSubtotal: moqSubtotal,
          authorizedNet30Tags: net30Tags,
          highValueCardThreshold: wireThreshold,
          poEnabled: togglePo ? togglePo.checked : true,
          blockPoBoxOnFreight: togglePobox ? togglePobox.checked : true,
          moqEnabled: toggleMoq ? toggleMoq.checked : true,
          hazmatEnabled: toggleHazmat ? toggleHazmat.checked : true
        };
      }

      async function handleSave() {
        const payload = gatherRulesPayload();
        const res = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          if (saveBanner) {
            saveBanner.textContent = 'Error saving rules';
            saveBanner.style.background = '#FEE2E2';
            saveBanner.style.color = '#991B1B';
          }
          return;
        }
        if (byteCounter) {
          byteCounter.textContent =
            'rules_config: ' + data.validationMetafield.byteLength + ' B / 10,240 B (' +
            data.validationMetafield.budgetUtilizationPercent + '%) • payment_rules: ' +
            data.paymentMetafield.byteLength + ' B / 10,240 B';
        }
        if (jsonPreview) jsonPreview.textContent = data.validationMetafield.value;
        if (saveBanner) {
          saveBanner.textContent = 'Rules saved (' + payload.poRegexPattern + ')';
          saveBanner.style.background = '#CDFEE1';
          saveBanner.style.color = '#0C5132';
        }
      }

      if (saveBtn) saveBtn.addEventListener('click', handleSave);
      if (pageSaveBtn) pageSaveBtn.addEventListener('click', handleSave);

      async function handleSimulate() {
        const poIn = document.getElementById('sim-po-input');
        const tagIn = document.getElementById('sim-tags-input');
        const subIn = document.getElementById('sim-subtotal-input');
        const addrIn = document.getElementById('sim-address1-input');
        const compIn = document.getElementById('sim-company-input');
        const qtyIn = document.getElementById('sim-sku-qty-input');

        const poNumber = poIn ? poIn.value : '';
        const tagsRaw = tagIn ? tagIn.value : '';
        const customerTags = tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
        const cartSubtotal = subIn ? parseFloat(subIn.value) || 0 : 1250;
        const billingAddress1 = addrIn ? addrIn.value : '400 Market St';
        const billingCompany = compIn && compIn.value ? compIn.value : 'Apex Industrial Supply LLC';
        const qty = qtyIn ? parseInt(qtyIn.value, 10) || 12 : 12;

        const freightQtyDisplay = document.getElementById('sim-freight-qty-display');
        if (freightQtyDisplay) freightQtyDisplay.value = String(qty);

        const companyTitle = document.getElementById('preview-company-title');
        if (companyTitle) companyTitle.textContent = billingCompany;

        if (poNumber === 'INVALID-123' && scenarioFailBtn && scenarioPassBtn) {
          scenarioFailBtn.classList.add('Polaris-Button--pressed');
          scenarioPassBtn.classList.remove('Polaris-Button--pressed');
        } else if (poNumber === 'PO-849201' && scenarioFailBtn && scenarioPassBtn) {
          scenarioPassBtn.classList.add('Polaris-Button--pressed');
          scenarioFailBtn.classList.remove('Polaris-Button--pressed');
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

        if (simStatusPill) {
          if (report.checkoutPassed) {
            simStatusPill.className = 'Polaris-Badge Polaris-Badge--toneSuccess';
            simStatusPill.innerHTML = '<span class="Polaris-Text--root Polaris-Text--bodySm">Checkout approved</span><span style="display:none">CHECKOUT APPROVED (0 ERRORS)</span>';
          } else {
            simStatusPill.className = 'Polaris-Badge Polaris-Badge--toneCritical';
            simStatusPill.innerHTML = '<span class="Polaris-Text--root Polaris-Text--bodySm">' + report.validationErrors.length + ' checkout errors</span><span style="display:none">CHECKOUT BLOCKED (' + report.validationErrors.length + ' ERRORS)</span>';
          }
        }

        const poErr = report.validationErrors.find(function (e) { return e.target === '$.cart.poNumber'; });
        const addrErr = report.validationErrors.find(function (e) { return e.target.indexOf('$.cart.billingAddress') === 0; });
        const cartErrs = report.validationErrors.filter(function (e) { return e.target === '$.cart'; });

        const poSectionHtml =
          '<div style="margin-bottom:10px;">' +
            '<div class="shopify-checkout-section-heading">' +
              '<span>Purchase order number</span>' +
              '<span style="font-size:11px;color:#616161;">B2B order reference</span>' +
            '</div>' +
            '<div class="shopify-floating-input ' + (poErr ? 'shopify-floating-input--error' : '') + '">' +
              '<span class="shopify-floating-label">Purchase order number</span>' +
              '<span class="shopify-floating-value">' + (poNumber || '(No PO entered)') + '</span>' +
            '</div>' +
            (poErr
              ? '<div class="shopify-checkout-inline-error" data-target="' + poErr.target + '">' + warningSvg + '<span>Enter a valid corporate PO number matching PO-XXXXXX — ' + poErr.localizedMessage + '</span><span style="display:none">' + poErr.target + '</span></div>'
              : '<div class="shopify-checkout-inline-valid">✓ Valid corporate Purchase Order number</div>') +
          '</div>';

        const addrSectionHtml =
          '<div>' +
            '<div class="shopify-checkout-section-heading">' +
              '<span>Billing &amp; shipping address</span>' +
              '<span style="font-size:11px;color:#616161;">Commercial LTL Freight</span>' +
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

        if (errorsContainer) {
          errorsContainer.innerHTML = poSectionHtml + addrSectionHtml;
        }

        const sortedMethods = report.paymentMethodsPreview.slice().sort(function (a, b) {
          if (a.promotedToTop && !b.promotedToTop) return -1;
          if (!a.promotedToTop && b.promotedToTop) return 1;
          if (a.visible && !b.visible) return -1;
          if (!a.visible && b.visible) return 1;
          return 0;
        });

        if (paymentsContainer) {
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
        }
      }

      if (runSimBtn) runSimBtn.addEventListener('click', handleSimulate);
      if (pageRunBtn) pageRunBtn.addEventListener('click', handleSimulate);
    })();
  </script>
</body>
</html>`;
}
