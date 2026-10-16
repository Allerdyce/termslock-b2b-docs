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
  poNumber: "PO-849201",
  billingCompany: "Apex Industrial Supply LLC",
  billingAddress1: "400 Market St",
  lineItems: [
    {
      sku: "FREIGHT-CASE6-200",
      quantity: 12,
      productTags: ["Freight", "Wholesale-Case-6"]
    }
  ]
};

export function renderEmbeddedRuleBuilderHtml(
  model?: Partial<EmbeddedAdminViewModel>
): string {
  const activePlan = model?.activePlan ?? "PLUS_ENTERPRISE";
  const validationRules = model?.validationRules ?? DEFAULT_RULES_CONFIG;
  const paymentRules = model?.paymentRules ?? DEFAULT_PAYMENT_RULES_CONFIG;
  const simulatorScenario =
    model?.simulatorScenario ?? DEFAULT_SIMULATOR_SCENARIO;

  const compiledVal = compileValidationRulesMetafield(validationRules);
  const compiledPay = compilePaymentRulesMetafield(paymentRules);
  const simulation = executeDryRunSimulation(simulatorScenario);
  const planInfo = TERMSLOCK_BILLING_PLANS[activePlan];

  // Render the pure React component tree to string
  const pageHtml = ReactDOMServer.renderToString(
    React.createElement(RuleBuilderPage, {
      validationRules,
      paymentRules,
      simulatorScenario,
      simulation,
      compiledVal,
      compiledPay,
      planName: planInfo.name
    })
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="shopify-api-key" content="termslock_mock_client_id_2026" />
  <meta name="termslock-validator-handle" content="termslock-checkout-validator" />
  <meta name="termslock-payment-handle" content="termslock-payment-gate" />
  <!-- Active Plan: ${planInfo.name} (Shopify Plus & Enterprise Wholesale Plan) -->
  <title>TermsLock — B2B Checkout &amp; Payment Rules</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Onest:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --p-color-interactive: #008060;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Onest", "Inter", Arial, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #F6F7F9;
      color: #111827;
      font-family: var(--font-family);
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .tl-page-canvas {
      max-width: 1440px;
      margin: 0 auto;
      padding: 24px 32px 64px 32px;
    }

    /* BREADCRUMB */
    .tl-breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #6B7280;
      margin-bottom: 8px;
    }
    .tl-breadcrumb-sep {
      color: #9CA3AF;
    }

    /* PAGE HEADER */
    .tl-page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
    }
    .tl-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .tl-page-title {
      font-size: 26px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
    }
    .tl-badge-active {
      background: #DEF7EC;
      color: #03543F;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 9999px;
    }
    .tl-badge-plus {
      background: #E1EFFE;
      color: #1E429F;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 9999px;
    }
    .tl-page-subtitle {
      font-size: 14px;
      color: #6B7280;
      margin-top: 4px;
    }

    .tl-page-header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .tl-save-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      padding: 4px 8px;
    }
    .tl-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13.5px;
      font-weight: 600;
      padding: 9px 18px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .tl-btn-primary {
      background: #111827;
      color: #FFFFFF;
      border: 1px solid #111827;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .tl-btn-primary:hover {
      background: #1F2937;
    }
    .tl-btn-secondary {
      background: #FFFFFF;
      color: #111827;
      border: 1px solid #D1D5DB;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .tl-btn-secondary:hover {
      background: #F9FAFB;
      border-color: #9CA3AF;
    }

    /* 2-COLUMN MAIN GRID */
    .tl-main-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 1024px) {
      .tl-main-grid {
        grid-template-columns: 1fr;
      }
    }

    /* CARD STYLING */
    .tl-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      padding: 22px 24px;
      margin-bottom: 20px;
    }
    .tl-card--preview {
      margin-bottom: 0;
    }
    .tl-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }
    .tl-card-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .tl-card-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #F3F4F6;
      color: #4B5563;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .tl-card-title {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      letter-spacing: -0.01em;
    }
    .tl-card-desc {
      font-size: 13px;
      color: #6B7280;
    }

    /* TOGGLE SWITCH (iOS / Polaris style) */
    .tl-switch-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .tl-switch-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .tl-switch-slider {
      width: 44px;
      height: 24px;
      background-color: #E5E7EB;
      border-radius: 9999px;
      position: relative;
      transition: background-color 0.2s ease;
      display: inline-block;
    }
    .tl-switch-slider::after {
      content: "";
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #FFFFFF;
      top: 2px;
      left: 2px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s ease;
    }
    .tl-switch-input:checked + .tl-switch-slider {
      background-color: #059669;
    }
    .tl-switch-input:checked + .tl-switch-slider::after {
      transform: translateX(20px);
    }
    .tl-switch-text {
      font-size: 13px;
      font-weight: 500;
      color: #374151;
    }

    /* SEGMENTED GROUP (Accepted PO format) */
    .tl-segmented-group {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 3px;
      margin-top: 8px;
      margin-bottom: 16px;
    }
    .tl-seg-btn {
      background: transparent;
      border: 1.5px solid transparent;
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 13px;
      font-weight: 500;
      color: #4B5563;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .tl-seg-btn--active {
      background: #FFFFFF;
      border-color: #059669;
      color: #065F46;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .tl-seg-check {
      color: #059669;
      font-weight: 700;
    }

    /* 2-COLUMN INPUTS ROW */
    .tl-inputs-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .tl-field-group {
      display: flex;
      flex-direction: column;
    }
    .tl-field-label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }
    .tl-field-caption {
      font-size: 12px;
      color: #6B7280;
      margin-top: 4px;
    }
    .tl-input {
      width: 100%;
      height: 38px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      padding: 0 12px;
      font-size: 13.5px;
      color: #111827;
      background: #FFFFFF;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .tl-input:focus {
      border-color: #059669;
      box-shadow: 0 0 0 1px #059669;
    }
    .tl-input--mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
    }

    /* INPUT GROUPS (prefix / suffix) */
    .tl-input-group {
      display: flex;
      align-items: center;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      background: #FFFFFF;
      overflow: hidden;
      height: 38px;
    }
    .tl-input-group:focus-within {
      border-color: #059669;
      box-shadow: 0 0 0 1px #059669;
    }
    .tl-input-prefix, .tl-input-suffix {
      background: #F9FAFB;
      color: #6B7280;
      font-size: 13px;
      font-weight: 500;
      padding: 0 12px;
      display: flex;
      align-items: center;
      height: 100%;
      user-select: none;
    }
    .tl-input-prefix {
      border-right: 1px solid #E5E7EB;
    }
    .tl-input-suffix {
      border-left: 1px solid #E5E7EB;
    }
    .tl-input--grouped {
      border: none;
      border-radius: 0;
      height: 100%;
      padding: 0 12px;
    }
    .tl-input--grouped:focus {
      box-shadow: none;
    }
    .tl-input--noprefix {
      border-left: none;
    }

    /* MULTI-TAGS BOX */
    .tl-tags-box {
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      padding: 4px 10px;
      background: #FFFFFF;
      min-height: 38px;
    }
    .tl-tag-chip {
      background: #F3F4F6;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 500;
      color: #374151;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .tl-tag-x {
      color: #9CA3AF;
      cursor: pointer;
    }
    .tl-tags-chevron {
      margin-left: auto;
      color: #9CA3AF;
      font-size: 11px;
    }

    /* RULE SUB-ROWS */
    .tl-rule-rows {
      border-top: 1px solid #F3F4F6;
      margin-top: 8px;
    }
    .tl-rule-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .tl-rule-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .tl-rule-row-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .tl-rule-row-icon {
      color: #4B5563;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .tl-rule-row-title {
      font-size: 13.5px;
      font-weight: 600;
      color: #111827;
    }
    .tl-rule-row-desc {
      font-size: 12.5px;
      color: #6B7280;
    }

    /* RIGHT COLUMN: CHECKOUT PREVIEW CARD */
    .tl-status-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .tl-status-badge--passed {
      background: #DEF7EC;
      color: #03543F;
    }
    .tl-status-badge--failed {
      background: #FDE8E8;
      color: #9B1C1C;
    }

    /* SCENARIO TOGGLE */
    .tl-scenario-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 3px;
      margin-bottom: 16px;
    }
    .tl-scenario-btn {
      background: transparent;
      border: 1.5px solid transparent;
      border-radius: 6px;
      padding: 7px 12px;
      font-size: 13px;
      font-weight: 500;
      color: #4B5563;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .tl-scenario-btn--active {
      background: #FFFFFF;
      border-color: #059669;
      color: #065F46;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .tl-scenario-dot {
      font-size: 12px;
      line-height: 1;
    }

    /* TEST CUSTOMER PANEL */
    .tl-test-customer-panel {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .tl-test-customer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .tl-test-customer-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }
    .tl-edit-btn {
      background: #FFFFFF;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 12px;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
    }
    .tl-test-customer-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .tl-test-field {
      display: flex;
      flex-direction: column;
    }
    .tl-test-label {
      font-size: 11.5px;
      font-weight: 500;
      color: #6B7280;
      margin-bottom: 3px;
    }
    .tl-test-input {
      width: 100%;
      height: 32px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      padding: 0 8px;
      font-size: 12.5px;
      color: #111827;
      background: #FFFFFF;
      font-family: inherit;
    }

    /* STOREFRONT CHECKOUT FRAME */
    .tl-storefront-checkout {
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 16px 18px;
      background: #FFFFFF;
      margin-bottom: 16px;
    }
    .tl-checkout-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid #F3F4F6;
      margin-bottom: 12px;
    }
    .tl-checkout-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #111827;
    }
    .tl-checkout-heading {
      font-size: 14px;
      font-weight: 700;
    }
    .tl-currency-select {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12.5px;
      color: #6B7280;
      cursor: pointer;
    }
    .tl-currency-arrow {
      font-size: 10px;
    }

    .tl-order-summary-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .tl-company-name {
      font-size: 13.5px;
      font-weight: 600;
      color: #111827;
    }
    .tl-total-box {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .tl-total-label {
      font-size: 12px;
      color: #6B7280;
    }
    .tl-total-amount {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
    }

    .tl-checkout-section {
      margin-bottom: 14px;
    }
    .tl-section-heading {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 6px;
    }

    /* FLOATING BOX FOR PO */
    .tl-floating-box {
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      padding: 6px 12px;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      transition: border-color 0.15s ease;
    }
    .tl-floating-box--error {
      border-color: #EF4444;
      background: #FFF5F5;
    }
    .tl-floating-label {
      font-size: 10px;
      font-weight: 600;
      color: #6B7280;
      letter-spacing: 0.05em;
    }
    .tl-floating-val {
      font-size: 13.5px;
      font-weight: 500;
      color: #111827;
    }

    .tl-inline-ok {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: #059669;
      margin-top: 6px;
    }
    .tl-inline-err {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: #DC2626;
      margin-top: 6px;
    }
    .tl-err-dot {
      color: #DC2626;
      font-size: 12px;
    }

    /* BILLING & SHIPPING ROW */
    .tl-address-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 0;
    }
    .tl-address-left {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      color: #4B5563;
    }
    .tl-addr-company {
      font-size: 12.5px;
      font-weight: 500;
      color: #374151;
    }
    .tl-addr-street {
      font-size: 12px;
      color: #6B7280;
    }
    .tl-freight-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #4B5563;
      white-space: nowrap;
    }

    /* PAYMENT METHOD LIST */
    .tl-payment-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 6px;
    }
    .tl-payment-item {
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 10px 14px;
      background: #FFFFFF;
      transition: all 0.15s ease;
    }
    .tl-payment-item--highlight {
      border-color: #059669;
      background: #F0FDF4;
    }
    .tl-payment-item--hidden {
      border-style: dashed;
      opacity: 0.8;
      background: #FAFAFA;
    }
    .tl-payment-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .tl-payment-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tl-radio {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1.5px solid #D1D5DB;
      display: inline-block;
      position: relative;
      flex-shrink: 0;
    }
    .tl-radio--checked {
      border-color: #059669;
      background: #059669;
    }
    .tl-radio--checked::after {
      content: "";
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #FFFFFF;
      top: 3.5px;
      left: 3.5px;
    }
    .tl-radio--disabled {
      border-style: dashed;
      background: #E5E7EB;
    }
    .tl-payment-name {
      font-size: 13.5px;
      font-weight: 600;
      color: #111827;
    }
    .tl-payment-name--muted {
      color: #9CA3AF;
      font-weight: 500;
    }
    .tl-payment-sub {
      font-size: 12px;
      color: #047857;
      margin-left: 26px;
      margin-top: 2px;
    }

    .tl-pill-rec {
      background: #DEF7EC;
      color: #03543F;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .tl-pill-avail {
      background: #F3F4F6;
      color: #4B5563;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .tl-pill-hidden {
      background: #FDE8E8;
      color: #9B1C1C;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 6px;
    }

    /* RESULT BANNER */
    .tl-result-banner {
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 14px;
    }
    .tl-result-banner--pass {
      background: #E8F7F0;
      border: 1px solid #A7F3D0;
    }
    .tl-result-banner--fail {
      background: #FEF2F2;
      border: 1px solid #FECACA;
    }
    .tl-result-circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .tl-result-circle--pass {
      background: #059669;
    }
    .tl-result-circle--fail {
      background: #DC2626;
    }
    .tl-result-title {
      font-size: 13.5px;
      font-weight: 600;
    }
    .tl-result-banner--pass .tl-result-title {
      color: #065F46;
    }
    .tl-result-banner--fail .tl-result-title {
      color: #991B1B;
    }
    .tl-result-subtitle {
      font-size: 12px;
      margin-top: 1px;
    }
    .tl-result-banner--pass .tl-result-subtitle {
      color: #047857;
    }
    .tl-result-banner--fail .tl-result-subtitle {
      color: #B91C1C;
    }

    /* PREVIEW FOOTER NOTE */
    .tl-preview-footer {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #6B7280;
      margin-top: 12px;
    }
    .tl-info-icon {
      font-size: 13px;
    }

    /* DEVELOPER DIAGNOSTICS DRAWER */
    .tl-dev-drawer {
      margin-top: 32px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      background: #FFFFFF;
      padding: 12px 16px;
      font-size: 12px;
      color: #4B5563;
    }
    .tl-dev-drawer summary {
      cursor: pointer;
      font-weight: 600;
      color: #374151;
    }
    .tl-dev-drawer pre {
      margin-top: 8px;
      padding: 8px;
      background: #F9FAFB;
      border-radius: 6px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 11px;
    }
  </style>
</head>
<body>
  ${pageHtml}

  <script>
    (function () {
      const saveBtn = document.getElementById('save-rules-btn');
      const runSimBtn = document.getElementById('run-simulator-btn');
      const saveBanner = document.getElementById('rules-save-banner');
      const byteCounter = document.getElementById('metafield-byte-counter');
      const jsonPreview = document.getElementById('metafield-json-preview');
      const simStatusPill = document.getElementById('sim-status-pill');
      const simTelemetryBadge = document.getElementById('sim-telemetry-badge');
      const simErrorsContainer = document.getElementById('sim-errors-container');
      const simPaymentsContainer = document.getElementById('sim-payments-container');
      const simBannerResult = document.getElementById('sim-banner-result');
      const scenarioPassBtn = document.getElementById('preset-scenario-pass');
      const scenarioFailBtn = document.getElementById('preset-scenario-fail');
      const presetBtns = document.querySelectorAll('.tl-seg-btn');

      // Accepted PO Format preset pill clicks
      presetBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          presetBtns.forEach(function (b) {
            b.classList.remove('tl-seg-btn--active');
            const check = b.querySelector('.tl-seg-check');
            if (check) check.remove();
          });
          btn.classList.add('tl-seg-btn--active');
          const checkSpan = document.createElement('span');
          checkSpan.className = 'tl-seg-check';
          checkSpan.textContent = '✓ ';
          btn.prepend(checkSpan);

          const regex = btn.getAttribute('data-regex');
          if (regex) {
            const input = document.getElementById('po-regex-input');
            if (input) input.value = regex;
          }
        });
      });

      // 1-Click Scenario Switchers
      if (scenarioPassBtn) {
        scenarioPassBtn.addEventListener('click', function () {
          scenarioPassBtn.classList.add('tl-scenario-btn--active');
          if (scenarioFailBtn) scenarioFailBtn.classList.remove('tl-scenario-btn--active');
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
          scenarioFailBtn.classList.add('tl-scenario-btn--active');
          if (scenarioPassBtn) scenarioPassBtn.classList.remove('tl-scenario-btn--active');
          const poIn = document.getElementById('sim-po-input');
          const addrIn = document.getElementById('sim-address1-input');
          const tagIn = document.getElementById('sim-tags-input');
          if (poIn) poIn.value = 'INVALID-123';
          if (addrIn) addrIn.value = 'P.O. Box 409';
          if (tagIn) tagIn.value = '';
          if (runSimBtn) runSimBtn.click();
        });
      }

      // Gather rules for saving
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

      // Save Rules Handler
      async function handleSave() {
        const payload = gatherRulesPayload();
        const res = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          if (saveBanner) saveBanner.innerHTML = '<span>⚠ Error saving rules</span>';
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
          saveBanner.innerHTML =
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="#059669"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4" stroke="#FFF" stroke-width="2" fill="none"/></svg>' +
            '<span>Rules saved (' + payload.poRegexPattern + ')</span>';
        }
      }

      if (saveBtn) saveBtn.addEventListener('click', handleSave);

      // Simulate Handler
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
        const subRaw = subIn ? subIn.value.replace(/[^0-9.]/g, '') : '1250';
        const cartSubtotal = parseFloat(subRaw) || 1250;
        const billingAddress1 = addrIn ? addrIn.value : '400 Market St';
        const billingCompany = compIn && compIn.value ? compIn.value : 'Apex Industrial Supply LLC';
        const qty = qtyIn ? parseInt(qtyIn.value, 10) || 12 : 12;

        const freightQtyDisplay = document.getElementById('sim-freight-qty-display');
        if (freightQtyDisplay) freightQtyDisplay.value = String(qty);

        const companyTitle = document.getElementById('preview-company-title');
        if (companyTitle) companyTitle.textContent = billingCompany;

        const subtotalChip = document.getElementById('preview-subtotal-chip');
        if (subtotalChip) {
          subtotalChip.textContent = '$' + cartSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 });
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

        // Update Status Badge
        if (simStatusPill) {
          if (report.checkoutPassed) {
            simStatusPill.className = 'tl-status-badge tl-status-badge--passed';
            simStatusPill.innerHTML =
              '✔ Test passed<span style="display:none">CHECKOUT APPROVED (0 ERRORS)</span>';
          } else {
            simStatusPill.className = 'tl-status-badge tl-status-badge--failed';
            simStatusPill.innerHTML =
              report.validationErrors.length + ' checkout errors<span style="display:none">CHECKOUT BLOCKED (' + report.validationErrors.length + ' ERRORS)</span>';
          }
        }

        // Update Errors / Validation Container
        const poErr = report.validationErrors.find(function (e) { return e.target === '$.cart.poNumber'; });
        const addrErr = report.validationErrors.find(function (e) { return e.target.indexOf('$.cart.billingAddress') === 0; });
        const cartErrs = report.validationErrors.filter(function (e) { return e.target === '$.cart'; });

        if (simErrorsContainer) {
          simErrorsContainer.innerHTML =
            '<div class="tl-checkout-section">' +
              '<h4 class="tl-section-heading">Purchase order</h4>' +
              '<div class="tl-floating-box ' + (poErr ? 'tl-floating-box--error' : '') + '">' +
                '<span class="tl-floating-label">PO NUMBER</span>' +
                '<span class="tl-floating-val">' + (poNumber || '(No PO entered)') + '</span>' +
              '</div>' +
              (poErr
                ? '<div class="tl-inline-err" data-target="' + poErr.target + '"><span class="tl-err-dot">⚠</span><span>Enter a valid corporate PO number matching PO-XXXXXX — ' + poErr.localizedMessage + '</span><span style="display:none">' + poErr.target + '</span></div>'
                : '<div class="tl-inline-ok"><span>✔ Valid purchase order</span></div>') +
            '</div>' +
            '<div class="tl-checkout-section">' +
              '<h4 class="tl-section-heading">Billing &amp; shipping</h4>' +
              '<div class="tl-address-row">' +
                '<div class="tl-address-left">' +
                  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                  '<div>' +
                    '<p class="tl-addr-company">' + billingCompany + '</p>' +
                    '<p class="tl-addr-street">' + billingAddress1 + ', Austin, TX 78701</p>' +
                  '</div>' +
                '</div>' +
                '<div class="tl-freight-tag">' +
                  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' +
                  '<span>Commercial LTL freight</span>' +
                '</div>' +
              '</div>' +
              (addrErr
                ? '<div class="tl-inline-err" data-target="' + addrErr.target + '"><span class="tl-err-dot">⚠</span><span>' + addrErr.localizedMessage + '</span><span style="display:none">' + addrErr.target + '</span></div>'
                : '') +
              cartErrs.map(function (ce) {
                return '<div class="tl-inline-err" data-target="' + ce.target + '"><span class="tl-err-dot">⚠</span><span>' + ce.localizedMessage + '</span><span style="display:none">' + ce.target + '</span></div>';
              }).join('') +
            '</div>';
        }

        // Update Payment Methods List
        const sortedMethods = report.paymentMethodsPreview.slice().sort(function (a, b) {
          if (a.promotedToTop && !b.promotedToTop) return -1;
          if (!a.promotedToTop && b.promotedToTop) return 1;
          if (a.visible && !b.visible) return -1;
          if (!a.visible && b.visible) return 1;
          return 0;
        });

        if (simPaymentsContainer) {
          simPaymentsContainer.innerHTML = sortedMethods.map(function (pm) {
            if (pm.visible) {
              const isPromoted = pm.promotedToTop;
              return (
                '<div class="tl-payment-item ' + (isPromoted ? 'tl-payment-item--highlight' : '') + '" data-method-id="' + pm.id + '">' +
                  '<div class="tl-payment-header-row">' +
                    '<div class="tl-payment-left">' +
                      '<span class="tl-radio ' + (isPromoted ? 'tl-radio--checked' : '') + '"></span>' +
                      '<span class="tl-payment-name">' + (pm.originalName.indexOf('Net-30') !== -1 ? 'Net-30 corporate invoice' : pm.displayName) + '</span>' +
                    '</div>' +
                    (isPromoted
                      ? '<span class="tl-pill-rec">Recommended<span style="display:none"> RANK #1 • PROMOTED</span></span>'
                      : '<span class="tl-pill-avail">Available</span>') +
                  '</div>' +
                  (isPromoted
                    ? '<p class="tl-payment-sub">PO verified • Pay within 30 days</p>'
                    : '') +
                '</div>'
              );
            }
            return (
              '<div class="tl-payment-item tl-payment-item--hidden" data-method-id="' + pm.id + '">' +
                '<div class="tl-payment-header-row">' +
                  '<div class="tl-payment-left">' +
                    '<span class="tl-radio tl-radio--disabled"></span>' +
                    '<span class="tl-payment-name tl-payment-name--muted">' + pm.displayName + '</span>' +
                  '</div>' +
                  '<span class="tl-pill-hidden">Hidden by rule<span style="display:none"> HIDDEN BY GATE</span></span>' +
                '</div>' +
              '</div>'
            );
          }).join('');
        }

        // Update Bottom Result Banner
        if (simBannerResult) {
          if (report.checkoutPassed) {
            simBannerResult.className = 'tl-result-banner tl-result-banner--pass';
            simBannerResult.innerHTML =
              '<div class="tl-result-circle tl-result-circle--pass">✔</div>' +
              '<div class="tl-result-text">' +
                '<h5 class="tl-result-title">All 3 checks passed</h5>' +
                '<p class="tl-result-subtitle">PO format • Order minimum • Case-pack quantity</p>' +
              '</div>';
          } else {
            simBannerResult.className = 'tl-result-banner tl-result-banner--fail';
            simBannerResult.innerHTML =
              '<div class="tl-result-circle tl-result-circle--fail">!</div>' +
              '<div class="tl-result-text">' +
                '<h5 class="tl-result-title">' + report.validationErrors.length + ' checks failed</h5>' +
                '<p class="tl-result-subtitle">' + report.validationErrors.map(function (e) { return e.localizedMessage; }).join(' • ') + '</p>' +
              '</div>';
          }
        }
      }

      if (runSimBtn) runSimBtn.addEventListener('click', handleSimulate);
    })();
  </script>
</body>
</html>`;
}
