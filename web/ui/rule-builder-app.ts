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
import { CLIENT_HYDRATION_SCRIPT } from "./client-script.ts";

export interface EmbeddedAdminViewModel {
  activePlan: BillingPlanTier;
  validationRules: TermsLockRulesConfig;
  paymentRules: TermsLockPaymentRulesConfig;
  simulatorScenario: DryRunSimulatorScenario;
  isEmbedded?: boolean;
  apiKey?: string;
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
  const isEmbedded = model?.isEmbedded ?? false;

  const compiledVal = compileValidationRulesMetafield(validationRules);
  const compiledPay = compilePaymentRulesMetafield(paymentRules);
  const simulation = executeDryRunSimulation(simulatorScenario);
  const planInfo = TERMSLOCK_BILLING_PLANS[activePlan];

  // Render the pure React component tree + Admin Host Shell to string
  const pageHtml = ReactDOMServer.renderToString(
    React.createElement(
      AdminHostShell,
      {
        storeName: "Apex Industrial B2B",
        activeAppName: "TermsLock B2B Rules",
        planName: planInfo.name,
        isEmbedded
      },
      React.createElement(RuleBuilderPage, {
        validationRules,
        paymentRules,
        simulatorScenario,
        simulation,
        compiledVal,
        compiledPay,
        planName: planInfo.name
      })
    )
  );

  return `<!DOCTYPE html>
<html lang="en" class="p-theme-light ${isEmbedded ? "is-embedded" : ""}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="shopify-api-key" content="${model?.apiKey || process.env.SHOPIFY_API_KEY || "SHOPIFY_API_KEY_PLACEHOLDER"}" />
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <meta name="termslock-validator-handle" content="termslock-checkout-validator" />
  <meta name="termslock-payment-handle" content="termslock-payment-gate" />
  <!-- Active Plan: ${planInfo.name} (Shopify Plus & Enterprise Wholesale Plan) -->
  <title>TermsLock — B2B Checkout &amp; Payment Rules</title>
  <script>
    (function () {
      try {
        var isIframe = window.top !== window.self;
        var search = window.location.search || '';
        var isEmbedded = isIframe || search.indexOf('embedded=1') !== -1 || search.indexOf('host=') !== -1;
        if (isEmbedded) {
          document.documentElement.classList.add('is-embedded');
          if (document.body) document.body.classList.add('is-embedded');
        }
      } catch (err) {
        document.documentElement.classList.add('is-embedded');
      }
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Onest:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/polaris.css" />
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
      background: #006E52;
    }

    .shopify-host-app-viewport {
      width: 100%;
    }

    /* EMBEDDED IFRAME CHROME GUARD */
    /* When embedded inside Shopify Admin iframe (window.top !== window.self) or ?embedded=1 or ?host= */
    .is-embedded .admin-host-topbar,
    .is-embedded .admin-host-sidebar,
    .is-embedded .admin-host-save-bar,
    .is-embedded .shopify-host-topbar,
    .is-embedded .shopify-host-sidebar,
    .is-embedded .shopify-host-save-bar {
      display: none !important;
    }

    .is-embedded .shopify-host-body {
      display: block !important;
      width: 100% !important;
    }

    .is-embedded .shopify-host-main-content,
    .is-embedded .shopify-host-app-viewport {
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      background: transparent !important;
    }

    .is-embedded .shopify-admin-host-frame {
      min-height: auto !important;
      background: transparent !important;
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
    .tl-page-header-left {
      min-width: 0;
    }
    .tl-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .tl-page-title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }
    .tl-badge-active {
      background: #DEF7EC;
      color: #03543F;
      font-size: 11.5px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 9999px;
      white-space: nowrap !important;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      line-height: 1.2;
    }
    .tl-badge-plus {
      background: #E1EFFE;
      color: #1E429F;
      font-size: 11.5px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 9999px;
      white-space: nowrap !important;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      line-height: 1.2;
    }
    .tl-page-subtitle {
      font-size: 13.5px;
      color: #6B7280;
      margin-top: 4px;
    }

    .tl-page-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      flex-wrap: nowrap;
    }
    @media (max-width: 960px) {
      .tl-page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }
      .tl-page-header-actions {
        justify-content: flex-start;
        flex-wrap: wrap;
      }
    }
    .tl-save-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      padding: 4px 8px;
      white-space: nowrap !important;
      flex-shrink: 0;
    }
    .tl-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
      white-space: nowrap !important;
      flex-shrink: 0;
      line-height: 1.2;
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

    /* DOMAIN NAVIGATION TABS (Option 1) */
    .tl-nav-tabs {
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid #E5E7EB;
      margin-bottom: 20px;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 1px;
    }
    .tl-nav-tabs::-webkit-scrollbar {
      display: none;
    }
    .tl-tab-item {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 9px 14px 11px;
      font-size: 13.5px;
      font-weight: 500;
      color: #6B7280;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
      font-family: inherit;
      margin-bottom: -1px;
      outline: none;
      white-space: nowrap !important;
      flex-shrink: 0;
    }
    .tl-tab-item:hover {
      color: #111827;
    }
    .tl-tab-item--active {
      color: #111827;
      font-weight: 600;
      border-bottom-color: #111827;
    }
    .tl-tab-count {
      background: #F3F4F6;
      color: #4B5563;
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 9999px;
      white-space: nowrap !important;
      flex-shrink: 0;
    }
    .tl-tab-item--active .tl-tab-count {
      background: #E5E7EB;
      color: #111827;
    }

    /* 2-COLUMN MAIN GRID */
    .tl-main-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 1140px) {
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
    .tl-summary-card {
      margin-bottom: 20px;
    }
    .tl-summary-bullets {
      list-style: none;
      padding: 0;
      margin: 0 0 16px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .tl-summary-bullet {
      font-size: 13px;
      color: #374151;
      line-height: 1.4;
      font-weight: 500;
    }
    .tl-btn--full {
      width: 100%;
    }
    .tl-card--preview {
      margin-bottom: 0;
      min-height: 580px;
      box-sizing: border-box;
    }
    .tl-test-customer-drawer {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }
    .tl-test-customer-summary {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      list-style: none;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      user-select: none;
    }
    .tl-test-customer-summary::-webkit-details-marker {
      display: none;
    }
    .tl-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }
    .tl-card-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
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
      font-size: 15.5px;
      font-weight: 600;
      color: #111827;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .tl-card-desc {
      font-size: 12.5px;
      color: #6B7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
    @media (max-width: 640px) {
      .tl-segmented-group {
        grid-template-columns: repeat(2, 1fr);
      }
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
    @media (max-width: 640px) {
      .tl-inputs-2col {
        grid-template-columns: 1fr;
      }
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
      font-size: 11.5px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap !important;
      flex-shrink: 0;
      line-height: 1.2;
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
      padding: 7px 10px;
      font-size: 12.5px;
      font-weight: 500;
      color: #4B5563;
      cursor: pointer;
      white-space: nowrap !important;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
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
      white-space: nowrap !important;
      flex-shrink: 0;
    }
    .tl-test-customer-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    @media (max-width: 1320px) and (min-width: 1141px) {
      .tl-test-customer-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 640px) {
      .tl-test-customer-grid {
        grid-template-columns: 1fr;
      }
    }
    .tl-test-field {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .tl-test-label {
      font-size: 11.5px;
      font-weight: 500;
      color: #6B7280;
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      box-sizing: border-box;
    }

    /* STOREFRONT CHECKOUT FRAME */
    .tl-storefront-checkout {
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 16px 18px;
      background: #FFFFFF;
      margin-bottom: 16px;
      min-height: 420px;
      box-sizing: border-box;
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
      white-space: nowrap !important;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      line-height: 1.2;
    }
    .tl-pill-avail {
      background: #F3F4F6;
      color: #4B5563;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap !important;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      line-height: 1.2;
    }
    .tl-pill-hidden {
      background: #FDE8E8;
      color: #9B1C1C;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap !important;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      line-height: 1.2;
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

  <script src="/app.bundle.js" defer></script>
  <script>
    ${CLIENT_HYDRATION_SCRIPT}
  </script>
</body>
</html>`;
}
