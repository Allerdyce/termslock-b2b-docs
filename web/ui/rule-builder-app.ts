import { DEFAULT_RULES_CONFIG } from "../../extensions/b2b-checkout-validator/src/run.js";
import type { TermsLockRulesConfig } from "../../extensions/b2b-checkout-validator/src/types.js";
import { DEFAULT_PAYMENT_RULES_CONFIG } from "../../extensions/b2b-payment-gate/src/run.js";
import type { TermsLockPaymentRulesConfig } from "../../extensions/b2b-payment-gate/src/types.js";
import {
  TERMSLOCK_BILLING_PLANS,
  type BillingPlanTier
} from "../billing/shopify-billing.js";
import {
  executeDryRunSimulation,
  type DryRunSimulatorScenario
} from "../simulator/dry-run-simulator.js";

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
      sku: "CASE6-VALVE-200",
      quantity: 12,
      productTags: ["Wholesale-Case-6"]
    }
  ]
};

/**
 * Renders the Embedded Admin Rule Builder & Dry-Run Checkout Simulator HTML document
 * styled with Shopify Polaris design tokens and Onest documentation typography.
 */
export function renderEmbeddedRuleBuilderHtml(
  state: Partial<EmbeddedAdminViewModel> = {}
): string {
  const activePlan = state.activePlan ?? "PLUS_ENTERPRISE";
  const validationRules = state.validationRules ?? DEFAULT_RULES_CONFIG;
  const paymentRules = state.paymentRules ?? DEFAULT_PAYMENT_RULES_CONFIG;
  const simulatorScenario =
    state.simulatorScenario ?? DEFAULT_SIMULATOR_SCENARIO;

  const simulation = executeDryRunSimulation(
    simulatorScenario,
    validationRules,
    paymentRules
  );

  const planSpec = TERMSLOCK_BILLING_PLANS[activePlan];

  const errorBadgesHtml =
    simulation.validationErrors.length === 0
      ? `<div class="polaris-banner polaris-banner--success">
           <strong>Checkout Validation Passed (0 Errors)</strong>
           <span>All 4 B2B validation gates cleared for target <code>$.cart.poNumber</code>, <code>$.cart.billingAddress.*</code>, and <code>$.cart</code>.</span>
         </div>`
      : simulation.validationErrors
          .map(
            (err) =>
              `<div class="polaris-banner polaris-banner--critical">
                 <code>${err.target}</code>
                 <span>${err.localizedMessage}</span>
               </div>`
          )
          .join("\n");

  const paymentMethodsHtml = simulation.paymentMethodsPreview
    .map(
      (pm) =>
        `<li class="payment-item ${pm.visible ? "payment-item--visible" : "payment-item--hidden"}">
           <span class="payment-name">${pm.displayName}</span>
           <span class="polaris-badge ${pm.visible ? "polaris-badge--success" : "polaris-badge--attention"}">
             ${pm.visible ? (pm.promotedToTop ? "UNLOCKED & PROMOTED (#1)" : "VISIBLE") : "HIDDEN BY GATE"}
           </span>
         </li>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TermsLock — B2B PO, Tax & Net-30 Checkout Rules (API 2026-10)</title>
  <style>
    :root {
      --p-color-bg-surface: #ffffff;
      --p-color-bg-app: #f1f2f4;
      --p-color-text: #1a1c1d;
      --p-color-text-subdued: #5c5f62;
      --p-color-border: #e1e3e5;
      --p-color-interactive: #008060;
      --p-color-critical: #d82c0d;
      --p-color-critical-bg: #fff4f4;
      --p-color-success: #007f5f;
      --p-color-success-bg: #f1f8f5;
      --p-font-family-sans: 'Onest', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      --p-font-family-mono: 'JetBrains Mono', monospace;
    }
    body {
      margin: 0;
      padding: 24px;
      background: var(--p-color-bg-app);
      color: var(--p-color-text);
      font-family: var(--p-font-family-sans);
    }
    .polaris-page {
      max-width: 1200px;
      margin: 0 auto;
    }
    .polaris-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .polaris-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .polaris-card {
      background: var(--p-color-bg-surface);
      border: 1px solid var(--p-color-border);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .polaris-banner {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .polaris-banner--critical {
      background: var(--p-color-critical-bg);
      border: 1px solid var(--p-color-critical);
      color: var(--p-color-critical);
    }
    .polaris-banner--success {
      background: var(--p-color-success-bg);
      border: 1px solid var(--p-color-success);
      color: var(--p-color-success);
    }
    .polaris-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <main class="polaris-page">
    <header class="polaris-header">
      <div>
        <h1>TermsLock: B2B PO, Tax & Net-30 Checkout Rules</h1>
        <p>Shopify Functions API 2026-10 • Metafield Namespace: <code>$app:termslock</code> • Active Tier: <strong>${planSpec.name} ($${planSpec.amountUsd.toFixed(2)}/30d, 14-day Free Trial)</strong></p>
      </div>
    </header>

    <section class="polaris-grid">
      <article class="polaris-card" data-testid="rule-builder-panel">
        <h2>Active B2B Governance Rules</h2>
        <ul>
          <li><strong>PO Number Regex Gate ($.cart.poNumber):</strong> <code>${validationRules.poRule.regexPattern}</code> (Min Subtotal: $${validationRules.poRule.subtotalThreshold.toFixed(2)})</li>
          <li><strong>Billing Address & Freight PO Box Blocker ($.cart.billingAddress.*):</strong> ${validationRules.billingRule.blockPoBoxOnFreight ? "Enabled" : "Disabled"}</li>
          <li><strong>Wholesale MOQ & Case-Pack Multipliers ($.cart):</strong> $${validationRules.moqRule.minimumSubtotal.toFixed(2)} MOQ (6x / 12x Case Packs)</li>
          <li><strong>Net-30 & Wholesale Payment Gate:</strong> Lock <code>Net-30 / Invoice</code> unless tagged <code>${paymentRules.authorizedNet30Tags.join(" | ")}</code> + valid <code>cart.poNumber</code></li>
        </ul>
        <p class="telemetry">Metafield Budget: <code>rules_config</code> ${simulation.telemetry.validationMetafieldBytes} B / 10,240 B • <code>payment_rules</code> ${simulation.telemetry.paymentMetafieldBytes} B / 10,240 B</p>
      </article>

      <article class="polaris-card" data-testid="dry-run-simulator-panel">
        <h2>Dry-Run Checkout Simulator (Real-Time Preview)</h2>
        <div class="simulator-inputs">
          <p><strong>Sample Cart Subtotal:</strong> $${simulatorScenario.cartSubtotal.toFixed(2)}</p>
          <p><strong>Customer Tags:</strong> <code>${simulatorScenario.customerTags.join(", ") || "None"}</code></p>
          <p><strong>PO Number (cart.poNumber):</strong> <code>${simulatorScenario.poNumber || "(empty)"}</code></p>
          <p><strong>Billing Company:</strong> <code>${simulatorScenario.billingCompany || "(empty)"}</code></p>
        </div>
        <h3>Validation Gate Output</h3>
        ${errorBadgesHtml}
        <h3>Checkout Payment Methods Preview</h3>
        <ul class="payment-list">
          ${paymentMethodsHtml}
        </ul>
      </article>
    </section>
  </main>
</body>
</html>`;
}
