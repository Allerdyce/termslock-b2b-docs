import React from "react";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  TextField,
  Checkbox,
  Badge,
  Divider,
  Button,
  ButtonGroup,
  Tag,
  Tabs
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json" with { type: "json" };
import type { TermsLockRulesConfig } from "../../extensions/b2b-checkout-validator/src/types.ts";
import type { TermsLockPaymentRulesConfig } from "../../extensions/b2b-payment-gate/src/types.ts";
import type { DryRunSimulatorScenario, DryRunSimulationReport } from "../simulator/dry-run-simulator.ts";
import type { CompiledMetafieldPayload } from "../compiler/metafield-compiler.ts";

export interface RuleBuilderPageProps {
  validationRules: TermsLockRulesConfig;
  paymentRules: TermsLockPaymentRulesConfig;
  simulatorScenario: DryRunSimulatorScenario;
  simulation: DryRunSimulationReport;
  compiledVal: CompiledMetafieldPayload;
  compiledPay: CompiledMetafieldPayload;
  planName: string;
}

const e: (type: any, props?: any, ...children: any[]) => React.ReactElement = React.createElement;

export function RuleBuilderPage({
  validationRules,
  paymentRules,
  simulatorScenario,
  simulation,
  compiledVal,
  compiledPay,
  planName: _planName
}: RuleBuilderPageProps): React.ReactElement {
  const tabs = [
    { id: "rules-tab", content: "Rule Configuration", accessibilityLabel: "Rule Configuration", panelID: "rules-panel" },
    { id: "simulator-tab", content: "Storefront Checkout Simulator", accessibilityLabel: "Storefront Checkout Simulator", panelID: "simulator-panel" }
  ];

  const poError = simulation.validationErrors.find(
    (err: { target: string; localizedMessage: string }) => err.target === "$.cart.poNumber"
  );
  const addressError = simulation.validationErrors.find(
    (err: { target: string; localizedMessage: string }) => err.target.startsWith("$.cart.billingAddress")
  );
  const cartErrors = simulation.validationErrors.filter(
    (err: { target: string; localizedMessage: string }) => err.target === "$.cart"
  );

  const sortedPayments = [...simulation.paymentMethodsPreview].sort((a, b) => {
    if (a.promotedToTop && !b.promotedToTop) return -1;
    if (!a.promotedToTop && b.promotedToTop) return 1;
    if (a.visible && !b.visible) return -1;
    if (!a.visible && b.visible) return 1;
    return 0;
  });

  return e(
    AppProvider,
    { i18n: enTranslations },
    e(
      Page,
      {
        title: "B2B Checkout & Payment Rules",
        subtitle: "Enforce corporate PO numbers, wholesale minimums, and Net-30 payment rules at checkout",
        titleMetadata: e(Badge, { tone: "success" }, "Active"),
        primaryAction: {
          content: "Save rules",
          id: "page-save-rules-btn"
        },
        secondaryActions: [
          {
            content: "Run checkout test",
            id: "page-run-sim-btn"
          }
        ]
      },
      e(
        BlockStack,
        { gap: "400" },
        // TOP POLARIS TABS
        e(Tabs, { tabs: tabs, selected: 0 }),

        // CANONICAL 2/3 PRIMARY + 1/3 STICKY SUMMARY LAYOUT
        e(
          Layout,
          null,
          // LEFT 2/3 COLUMN: RULE CONFIGURATION CARDS
          e(
            Layout.Section,
            null,
            e(
              "form",
              { id: "rule-builder-form", onSubmit: (ev: React.SyntheticEvent) => ev.preventDefault() },
              e(
                BlockStack,
                { gap: "400" },
                // CARD 1: PURCHASE ORDER (PO) VALIDATION
                e(
                  Card,
                  null,
                  e(
                    BlockStack,
                    { gap: "400" },
                    e(
                      InlineStack,
                      { align: "space-between", blockAlign: "center" },
                      e(
                        BlockStack,
                        { gap: "100" },
                        e(Text, { as: "h2", variant: "headingMd" }, "Purchase Order (PO) Validation"),
                        e(Text, { as: "p", tone: "subdued" }, "Require a valid corporate PO number on wholesale and high-value B2B orders.")
                      ),
                      e(Checkbox, {
                        id: "toggle-po-gate",
                        label: "Enabled",
                        checked: validationRules.poRule.enabled,
                        onChange: () => {}
                      })
                    ),
                    // SEGMENTED BUTTON GROUP FOR PRESETS
                    e(
                      BlockStack,
                      { gap: "200" },
                      e(Text, { as: "span", variant: "bodySm", tone: "subdued" }, "PO Format Presets"),
                      e(
                        "div",
                        { className: "polaris-preset-btngroup" },
                        e(
                          ButtonGroup,
                          { variant: "segmented" },
                          e(Button, { pressed: true, id: "preset-po-corporate", "data-regex": "^PO-[0-9]{6}$" }, "Corporate (PO-XXXXXX)"),
                          e(Button, { id: "preset-po-numeric", "data-regex": "^[0-9]{5,10}$" }, "Numeric Only"),
                          e(Button, { id: "preset-po-nonempty", "data-regex": "^.+$" }, "Any Non-Empty"),
                          e(Button, { id: "preset-po-custom", "data-regex": "^PO-[0-9]{5,10}$" }, "Custom Regex")
                        )
                      )
                    ),
                    // FORM INPUTS
                    e(
                      InlineGrid,
                      { columns: ["twoThirds", "oneThird"], gap: "400" },
                      e(TextField, {
                        id: "po-regex-input",
                        name: "poRegexPattern",
                        label: "Purchase Order format pattern",
                        value: validationRules.poRule.regexPattern,
                        helpText: "Validates the native B2B Purchase Order field at checkout",
                        autoComplete: "off",
                        monospaced: true
                      }),
                      e(TextField, {
                        id: "po-threshold-input",
                        name: "poSubtotalThreshold",
                        label: "Minimum subtotal ($)",
                        prefix: "$",
                        type: "number",
                        value: String(validationRules.poRule.subtotalThreshold),
                        helpText: "Applies to all B2B orders",
                        autoComplete: "off"
                      })
                    )
                  )
                ),

                // CARD 2: WHOLESALE MINIMUMS & FREIGHT GUARDRAILS
                e(
                  Card,
                  null,
                  e(
                    BlockStack,
                    { gap: "400" },
                    e(
                      BlockStack,
                      { gap: "100" },
                      e(Text, { as: "h2", variant: "headingMd" }, "Wholesale Minimums & Freight Guardrails"),
                      e(Text, { as: "p", tone: "subdued" }, "Enforce minimum order amounts, case-pack multiples, and physical delivery addresses.")
                    ),
                    e(
                      InlineGrid,
                      { columns: 2, gap: "400" },
                      e(TextField, {
                        id: "moq-subtotal-input",
                        name: "minimumSubtotal",
                        label: "Wholesale minimum order subtotal",
                        prefix: "$",
                        type: "number",
                        value: String(validationRules.moqRule.minimumSubtotal),
                        autoComplete: "off"
                      }),
                      e(TextField, {
                        id: "sim-sku-qty-input",
                        label: "Case-pack quantity multiple",
                        suffix: "units",
                        type: "number",
                        value: String(simulatorScenario.lineItems?.[0]?.quantity ?? 12),
                        autoComplete: "off"
                      })
                    ),
                    e(Divider, null),
                    e(
                      BlockStack,
                      { gap: "300" },
                      e(Checkbox, {
                        id: "toggle-moq-gate",
                        label: "Enforce 6-unit / 12-unit case-pack multiples",
                        helpText: "Restricts wholesale SKU line items to case increments",
                        checked: validationRules.moqRule.enabled,
                        onChange: () => {}
                      }),
                      e(Checkbox, {
                        id: "toggle-pobox-gate",
                        label: "Block P.O. Box addresses on freight & pallet items",
                        helpText: "Prevents failed commercial freight deliveries to postal lockboxes",
                        checked: validationRules.billingRule.blockPoBoxOnFreight,
                        onChange: () => {}
                      }),
                      e(Checkbox, {
                        id: "toggle-hazmat-gate",
                        label: "Block incompatible hazmat items in the same cart",
                        helpText: "Enforces hazardous material shipping isolation rules",
                        checked: validationRules.hazmatRule.enabled,
                        onChange: () => {}
                      })
                    )
                  )
                ),

                // CARD 3: NET-30 INVOICE & PAYMENT METHOD VISIBILITY
                e(
                  Card,
                  null,
                  e(
                    BlockStack,
                    { gap: "400" },
                    e(
                      BlockStack,
                      { gap: "100" },
                      e(Text, { as: "h2", variant: "headingMd" }, "Net-30 Invoice & Payment Customization"),
                      e(Text, { as: "p", tone: "subdued" }, "Control which B2B buyers can select manual invoice terms or credit cards at checkout.")
                    ),
                    e(
                      InlineGrid,
                      { columns: 2, gap: "400" },
                      e(
                        BlockStack,
                        { gap: "200" },
                        e(Text, { as: "span", variant: "bodyMd", fontWeight: "medium" }, "Approved B2B customer tags"),
                        e(
                          InlineStack,
                          { gap: "200" },
                          paymentRules.authorizedNet30Tags.map((tag) => e(Tag, { key: tag }, tag))
                        ),
                        e("input", {
                          id: "net30-tags-input",
                          name: "authorizedNet30Tags",
                          type: "hidden",
                          value: paymentRules.authorizedNet30Tags.join(", ")
                        })
                      ),
                      e(TextField, {
                        id: "wire-threshold-input",
                        name: "highValueCardThreshold",
                        label: "Hide credit cards on wholesale orders above",
                        prefix: "$",
                        type: "number",
                        value: String(paymentRules.highValueCardThreshold),
                        autoComplete: "off"
                      })
                    ),
                    e(Divider, null),
                    e(
                      BlockStack,
                      { gap: "300" },
                      e(Checkbox, {
                        id: "toggle-net30-po",
                        label: "Hide Net-30 Invoice unless a valid PO number is entered",
                        checked: paymentRules.requirePoForNet30,
                        onChange: () => {}
                      }),
                      e(Checkbox, {
                        id: "toggle-cod-gate",
                        label: "Hide Cash on Delivery (COD) on B2B orders",
                        checked: paymentRules.hideCodForB2B,
                        onChange: () => {}
                      })
                    )
                  )
                )
              )
            )
          ),

          // RIGHT 1/3 COLUMN: ACTIVE RULE SUMMARY + STOREFRONT CHECKOUT PREVIEW
          e(
            Layout.Section,
            { variant: "oneThird" },
            e(
              BlockStack,
              { gap: "400" },
              // CARD A: ACTIVE RULE SUMMARY
              e(
                Card,
                null,
                e(
                  BlockStack,
                  { gap: "300" },
                  e(
                    InlineStack,
                    { align: "space-between", blockAlign: "center" },
                    e(Text, { as: "h2", variant: "headingMd" }, "Active Rule Summary"),
                    e(Badge, { tone: "success" }, "Active • 4 rules enabled")
                  ),
                  e(Text, { as: "p", tone: "subdued" }, "Target: Shopify Functions 2026-10"),
                  e(Divider, null),
                  e(
                    BlockStack,
                    { gap: "200" },
                    e("div", null, e(Text, { as: "p", variant: "bodySm" }, `• PO format ^PO-[0-9]{6}$ required ≥ $${validationRules.poRule.subtotalThreshold}`)),
                    e("div", null, e(Text, { as: "p", variant: "bodySm" }, `• $${validationRules.moqRule.minimumSubtotal} MOQ & 12-unit case packs`)),
                    e("div", null, e(Text, { as: "p", variant: "bodySm" }, "• Freight P.O. Box addresses blocked")),
                    e("div", null, e(Text, { as: "p", variant: "bodySm" }, "• Net-30 gated by tag + valid PO"))
                  ),
                  e(Divider, null),
                  e(
                    Button,
                    {
                      id: "run-simulator-btn",
                      variant: "primary",
                      size: "large",
                      fullWidth: true
                    },
                    "Launch Live Checkout Simulator →"
                  )
                )
              ),

              // CARD B: LIVE STOREFRONT MINI-PREVIEW
              e(
                Card,
                null,
                e(
                  BlockStack,
                  { gap: "300" },
                  e(
                    InlineStack,
                    { align: "space-between", blockAlign: "center" },
                    e(Text, { as: "h2", variant: "headingMd" }, "Storefront Checkout Preview"),
                    e(
                      "span",
                      {
                        id: "sim-status-pill",
                        className: `Polaris-Badge ${simulation.checkoutPassed ? "Polaris-Badge--toneSuccess" : "Polaris-Badge--toneCritical"}`
                      },
                      e(
                        "span",
                        { className: "Polaris-Text--root Polaris-Text--bodySm" },
                        simulation.checkoutPassed ? "Checkout approved" : `${simulation.validationErrors.length} checkout errors`
                      ),
                      e(
                        "span",
                        { style: { display: "none" } },
                        simulation.checkoutPassed ? "CHECKOUT APPROVED (0 ERRORS)" : `CHECKOUT BLOCKED (${simulation.validationErrors.length} ERRORS)`
                      )
                    )
                  ),
                  // 1-Click Scenario Preset Switcher
                  e(
                    "div",
                    { className: "checkout-scenario-pills" },
                    e(
                      ButtonGroup,
                      { variant: "segmented" },
                      e(Button, { id: "preset-scenario-pass", pressed: simulation.checkoutPassed }, "✓ Approved Net-30"),
                      e(Button, { id: "preset-scenario-fail", pressed: !simulation.checkoutPassed }, "✕ Blocked PO & Address")
                    )
                  ),
                  // REALISTIC SHOPIFY ONE-PAGE CHECKOUT MINI-FRAME
                  e(
                    "div",
                    { className: "shopify-onepage-checkout" },
                    e(
                      "div",
                      { className: "shopify-checkout-header" },
                      e(
                        "div",
                        { className: "shopify-checkout-store" },
                        e(
                          "svg",
                          { width: "16", height: "16", viewBox: "0 0 20 20", fill: "#1A1A1A" },
                          e("path", { fillRule: "evenodd", d: "M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z", clipRule: "evenodd" }),
                          e("path", { d: "M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" })
                        ),
                        e("span", null, "Checkout • ", e("span", { id: "preview-company-title" }, simulatorScenario.billingCompany ?? "Apex Industrial Supply LLC"))
                      ),
                      e(
                        "span",
                        { className: "Polaris-Badge Polaris-Badge--toneSuccess", id: "preview-subtotal-chip" },
                        e("span", { className: "Polaris-Text--root Polaris-Text--bodySm" }, `Order total: $${simulatorScenario.cartSubtotal.toFixed(2)} USD`)
                      )
                    ),
                    e(
                      "div",
                      { className: "shopify-checkout-body" },
                      e(
                        "div",
                        { id: "sim-errors-container" },
                        // Purchase order number section
                        e(
                          "div",
                          { style: { marginBottom: "10px" } },
                          e(
                            "div",
                            { className: "shopify-checkout-section-heading" },
                            e("span", null, "Purchase order number"),
                            e("span", { style: { fontSize: "11px", color: "#616161" } }, "B2B order reference")
                          ),
                          e(
                            "div",
                            { className: `shopify-floating-input ${poError ? "shopify-floating-input--error" : ""}` },
                            e("span", { className: "shopify-floating-label" }, "Purchase order number"),
                            e("span", { className: "shopify-floating-value" }, simulatorScenario.poNumber || "(No PO entered)")
                          ),
                          poError
                            ? e(
                                "div",
                                { className: "shopify-checkout-inline-error", "data-target": poError.target },
                                e(
                                  "svg",
                                  { className: "checkout-error-svg", viewBox: "0 0 20 20", fill: "currentColor" },
                                  e("path", { fillRule: "evenodd", d: "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" })
                                ),
                                e("span", null, `Enter a valid corporate PO number matching PO-XXXXXX — ${poError.localizedMessage}`),
                                e("span", { style: { display: "none" } }, poError.target)
                              )
                            : e("div", { className: "shopify-checkout-inline-valid" }, "✓ Valid corporate Purchase Order number")
                        ),

                        // Billing & shipping address section
                        e(
                          "div",
                          null,
                          e(
                            "div",
                            { className: "shopify-checkout-section-heading" },
                            e("span", null, "Billing & shipping address"),
                            e("span", { style: { fontSize: "11px", color: "#616161" } }, "Commercial LTL Freight")
                          ),
                          e(
                            "div",
                            { className: `shopify-floating-input ${addressError ? "shopify-floating-input--error" : ""}` },
                            e("span", { className: "shopify-floating-label" }, "Company & street address"),
                            e(
                              "span",
                              { className: "shopify-floating-value" },
                              `${simulatorScenario.billingCompany ?? "Apex Industrial Supply LLC"} • ${simulatorScenario.billingAddress1 ?? "400 Market St"}, Austin TX 78701`
                            )
                          ),
                          addressError
                            ? e(
                                "div",
                                { className: "shopify-checkout-inline-error", "data-target": addressError.target },
                                e(
                                  "svg",
                                  { className: "checkout-error-svg", viewBox: "0 0 20 20", fill: "currentColor" },
                                  e("path", { fillRule: "evenodd", d: "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" })
                                ),
                                e("span", null, addressError.localizedMessage),
                                e("span", { style: { display: "none" } }, addressError.target)
                              )
                            : null,
                          cartErrors.map((err: { target: string; localizedMessage: string }) =>
                            e(
                              "div",
                              { key: err.target, className: "shopify-checkout-inline-error", "data-target": err.target },
                              e(
                                "svg",
                                { className: "checkout-error-svg", viewBox: "0 0 20 20", fill: "currentColor" },
                                e("path", { fillRule: "evenodd", d: "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" })
                              ),
                              e("span", null, err.localizedMessage),
                              e("span", { style: { display: "none" } }, err.target)
                            )
                          )
                        )
                      ),

                      // Payment method radio selector
                      e(
                        "div",
                        null,
                        e(
                          "div",
                          { className: "shopify-checkout-section-heading" },
                          e("span", null, "Payment"),
                          e("span", { style: { fontSize: "11px", color: "#616161" } }, "Secure & encrypted")
                        ),
                        e(
                          "ul",
                          { id: "sim-payments-container", className: "checkout-payment-group" },
                          sortedPayments.map((pm, idx) => {
                            if (pm.visible) {
                              const isChecked = idx === 0;
                              return e(
                                "li",
                                {
                                  key: pm.id,
                                  className: `checkout-payment-row ${isChecked ? "checkout-payment-row--selected" : ""}`,
                                  "data-method-id": pm.id
                                },
                                e(
                                  "div",
                                  { className: "checkout-payment-left" },
                                  e("span", { className: `checkout-radio ${isChecked ? "checkout-radio--checked" : ""}` }),
                                  e("span", { className: "checkout-payment-label" }, pm.displayName)
                                ),
                                pm.promotedToTop
                                  ? e(
                                      "span",
                                      { className: "Polaris-Badge Polaris-Badge--toneSuccess" },
                                      e("span", { className: "Polaris-Text--root Polaris-Text--bodySm" }, "Default for B2B"),
                                      e("span", { style: { display: "none" } }, " RANK #1 • PROMOTED")
                                    )
                                  : e(
                                      "span",
                                      { className: "Polaris-Badge" },
                                      e("span", { className: "Polaris-Text--root Polaris-Text--bodySm" }, "Available")
                                    )
                              );
                            }
                            return e(
                              "li",
                              {
                                key: pm.id,
                                className: "checkout-payment-row checkout-payment-row--hidden",
                                "data-method-id": pm.id
                              },
                              e(
                                "div",
                                { className: "checkout-payment-left" },
                                e("span", { className: "checkout-radio checkout-radio--disabled" }),
                                e("span", { className: "checkout-payment-label checkout-payment-label--muted" }, pm.displayName)
                              ),
                              e(
                                "span",
                                { className: "Polaris-Badge Polaris-Badge--toneCritical" },
                                e("span", { className: "Polaris-Text--root Polaris-Text--bodySm" }, "Hidden by rule"),
                                e("span", { style: { display: "none" } }, " HIDDEN BY GATE")
                              )
                            );
                          })
                        )
                      )
                    )
                  ),

                  // EXPANDABLE TEST BUYER INPUTS
                  e(
                    "details",
                    { className: "simulator-custom-inputs-drawer" },
                    e("summary", { className: "simulator-custom-inputs-summary" }, "⚙ Customize test buyer inputs"),
                    e(
                      "form",
                      { id: "simulator-form", className: "checkout-test-inputs", onSubmit: (ev: React.SyntheticEvent) => ev.preventDefault() },
                      e(
                        "div",
                        { className: "polaris-field-item" },
                        e("label", { className: "Polaris-Label__Text", htmlFor: "sim-po-input" }, "PO Number"),
                        e("input", { id: "sim-po-input", className: "Polaris-TextField__InputBox", type: "text", defaultValue: simulatorScenario.poNumber ?? "" })
                      ),
                      e(
                        "div",
                        { className: "polaris-field-item" },
                        e("label", { className: "Polaris-Label__Text", htmlFor: "sim-company-input" }, "Company Name"),
                        e("input", { id: "sim-company-input", className: "Polaris-TextField__InputBox", type: "text", defaultValue: simulatorScenario.billingCompany ?? "Apex Industrial Supply LLC" })
                      ),
                      e(
                        "div",
                        { className: "polaris-field-item" },
                        e("label", { className: "Polaris-Label__Text", htmlFor: "sim-address1-input" }, "Billing Street"),
                        e("input", { id: "sim-address1-input", className: "Polaris-TextField__InputBox", type: "text", defaultValue: simulatorScenario.billingAddress1 ?? "" })
                      ),
                      e(
                        "div",
                        { className: "polaris-field-item" },
                        e("label", { className: "Polaris-Label__Text", htmlFor: "sim-tags-input" }, "Customer Tag"),
                        e("input", { id: "sim-tags-input", className: "Polaris-TextField__InputBox", type: "text", defaultValue: simulatorScenario.customerTags.join(", "), placeholder: "None (Retail)" })
                      ),
                      e(
                        "div",
                        { className: "polaris-field-item" },
                        e("label", { className: "Polaris-Label__Text", htmlFor: "sim-subtotal-input" }, "Cart Subtotal ($)"),
                        e("input", { id: "sim-subtotal-input", className: "Polaris-TextField__InputBox", type: "number", step: "50", defaultValue: simulatorScenario.cartSubtotal })
                      ),
                      e(
                        "div",
                        { className: "polaris-field-item" },
                        e("label", { className: "Polaris-Label__Text", htmlFor: "sim-freight-qty-display" }, "Freight Case Qty"),
                        e("input", { id: "sim-freight-qty-display", className: "Polaris-TextField__InputBox", type: "number", defaultValue: simulatorScenario.lineItems?.[0]?.quantity ?? 12, readOnly: true })
                      )
                    )
                  )
                )
              )
            )
          )
        ),

        // BELOW-THE-FOLD TECHNICAL DIAGNOSTICS ACCORDION
        e(
          "details",
          { id: "developer-diagnostics-drawer", className: "technical-diagnostics-details" },
          e("summary", null, "Technical diagnostics & Shopify Functions compilation telemetry"),
          e(
            "div",
            { style: { marginTop: "10px" } },
            e("span", null, "Handles: termslock-checkout-validator • termslock-payment-gate • $.cart.poNumber"),
            e("span", { id: "sim-telemetry-badge" }, `${simulation.telemetry.validationOutputBytes} B`),
            e(
              "div",
              { id: "metafield-byte-counter" },
              `rules_config: ${compiledVal.byteLength} B / 10,240 B (${compiledVal.budgetUtilizationPercent}%) • payment_rules: ${compiledPay.byteLength} B / 10,240 B`
            ),
            e("pre", { id: "metafield-json-preview" }, compiledVal.value)
          )
        )
      )
    )
  );
}
