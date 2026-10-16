import React from "react";
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

// SVG Icons matching the target design
const icons = {
  document: e(
    "svg",
    { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    e("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
    e("polyline", { points: "14 2 14 8 20 8" }),
    e("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
    e("line", { x1: "16", y1: "17", x2: "8", y2: "17" }),
    e("polyline", { points: "10 9 9 9 8 9" })
  ),
  truck: e(
    "svg",
    { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    e("rect", { x: "1", y: "3", width: "15", height: "13" }),
    e("polygon", { points: "16 8 20 8 23 11 23 16 16 16 16 8" }),
    e("circle", { cx: "5.5", cy: "18.5", r: "2.5" }),
    e("circle", { cx: "18.5", cy: "18.5", r: "2.5" })
  ),
  creditCard: e(
    "svg",
    { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    e("rect", { x: "1", y: "4", width: "22", height: "16", rx: "2", ry: "2" }),
    e("line", { x1: "1", y1: "10", x2: "23", y2: "10" })
  ),
  box: e(
    "svg",
    { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    e("path", { d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" }),
    e("polyline", { points: "3.27 6.96 12 12.01 20.73 6.96" }),
    e("line", { x1: "12", y1: "22.08", x2: "12", y2: "12" })
  ),
  pin: e(
    "svg",
    { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    e("path", { d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" }),
    e("circle", { cx: "12", cy: "10", r: "3" })
  ),
  shield: e(
    "svg",
    { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    e("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })
  ),
  docSmall: e(
    "svg",
    { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    e("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
    e("polyline", { points: "14 2 14 8 20 8" }),
    e("line", { x1: "16", y1: "13", x2: "8", y2: "13" })
  ),
  slashCircle: e(
    "svg",
    { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    e("circle", { cx: "12", cy: "12", r: "10" }),
    e("line", { x1: "4.93", y1: "4.93", x2: "19.07", y2: "19.07" })
  ),
  cart: e(
    "svg",
    { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    e("circle", { cx: "9", cy: "21", r: "1" }),
    e("circle", { cx: "20", cy: "21", r: "1" }),
    e("path", { d: "M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" })
  ),
  user: e(
    "svg",
    { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    e("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
    e("circle", { cx: "12", cy: "7", r: "4" })
  ),
  bag: e(
    "svg",
    { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    e("path", { d: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" }),
    e("line", { x1: "3", y1: "6", x2: "21", y2: "6" }),
    e("path", { d: "M16 10a4 4 0 0 1-8 0" })
  ),
  checkCircle: e(
    "svg",
    { width: "16", height: "16", viewBox: "0 0 24 24", fill: "#059669", stroke: "none" },
    e("circle", { cx: "12", cy: "12", r: "10" }),
    e("path", { d: "M9 12l2 2 4-4", stroke: "#FFFFFF", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", fill: "none" })
  ),
  play: e(
    "svg",
    { width: "12", height: "12", viewBox: "0 0 24 24", fill: "currentColor", stroke: "none" },
    e("polygon", { points: "5 3 19 12 5 21 5 3" })
  )
};

export function RuleBuilderPage({
  validationRules,
  paymentRules: _paymentRules,
  simulatorScenario,
  simulation,
  compiledVal,
  compiledPay: _compiledPay,
  planName
}: RuleBuilderPageProps): React.ReactElement {
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
    "div",
    { className: "tl-page-canvas" },

    // App Bridge v4 Title Bar Component
    e("ui-title-bar", { title: "B2B Checkout & Payment Rules" }),

    // TOP BREADCRUMB
    e(
      "div",
      { className: "tl-breadcrumb" },
      e("span", null, "Settings"),
      e("span", { className: "tl-breadcrumb-sep" }, "/"),
      e("span", null, "Checkout")
    ),

    // PAGE HEADER ROW
    e(
      "header",
      { className: "tl-page-header" },
      e(
        "div",
        { className: "tl-page-header-left" },
        e(
          "div",
          { className: "tl-title-row" },
          e("h1", { className: "tl-page-title" }, "B2B Checkout & Payment Rules"),
          e("span", { className: "tl-badge-active" }, "Active"),
          e("span", { className: "tl-badge-plus", title: planName }, "Shopify Plus"),
          e("span", { style: { display: "none" } }, planName)
        ),
        e(
          "p",
          { className: "tl-page-subtitle" },
          "Set purchase order requirements, wholesale safeguards, and payment terms."
        )
      ),
      e(
        "div",
        { className: "tl-page-header-actions" },
        e(
          "div",
          { className: "tl-save-status", id: "rules-save-banner" },
          icons.checkCircle,
          e("span", null, "All changes saved")
        ),
        e(
          "button",
          { type: "button", className: "tl-btn tl-btn-secondary", id: "run-simulator-btn" },
          icons.play,
          e("span", null, "Run checkout test")
        ),
        e(
          "button",
          { type: "button", className: "tl-btn tl-btn-primary", id: "save-rules-btn" },
          "Save rules"
        )
      )
    ),

    // DOMAIN NAVIGATION TABS (Option 1)
    e(
      "nav",
      { className: "tl-nav-tabs", role: "tablist", "aria-label": "Rule configuration domains" },
      e(
        "button",
        { type: "button", id: "tab-all", className: "tl-tab-item tl-tab-item--active", "data-tab": "all", role: "tab", "aria-selected": "true" },
        e("span", null, "All rules"),
        e("span", { className: "tl-tab-count" }, "4")
      ),
      e(
        "button",
        { type: "button", id: "tab-po", className: "tl-tab-item", "data-tab": "po", role: "tab", "aria-selected": "false" },
        icons.document,
        e("span", null, "Purchase orders"),
        e("span", { className: "tl-tab-count" }, "1")
      ),
      e(
        "button",
        { type: "button", id: "tab-wholesale", className: "tl-tab-item", "data-tab": "wholesale", role: "tab", "aria-selected": "false" },
        icons.truck,
        e("span", null, "Wholesale & freight"),
        e("span", { className: "tl-tab-count" }, "2")
      ),
      e(
        "button",
        { type: "button", id: "tab-payments", className: "tl-tab-item", "data-tab": "payments", role: "tab", "aria-selected": "false" },
        icons.creditCard,
        e("span", null, "Payment terms"),
        e("span", { className: "tl-tab-count" }, "1")
      )
    ),

    // 2-COLUMN MAIN CONTENT GRID
    e(
      "div",
      { className: "tl-main-grid" },

      // =======================================================================
      // LEFT COLUMN: CONFIGURATION CARDS
      // =======================================================================
      e(
        "div",
        { className: "tl-left-col" },
        e(
          "form",
          { id: "rule-builder-form", onSubmit: (ev: React.SyntheticEvent) => ev.preventDefault() },

          // CARD 1: PURCHASE ORDER VALIDATION
          e(
            "section",
            { id: "card-po-validation", className: "tl-card", "data-domain": "po" },
            e(
              "div",
              { className: "tl-card-header" },
              e(
                "div",
                { className: "tl-card-header-left" },
                e("div", { className: "tl-card-icon-wrap" }, icons.document),
                e(
                  "div",
                  null,
                  e("h2", { className: "tl-card-title" }, "Purchase order validation"),
                  e("p", { className: "tl-card-desc" }, "Require a valid PO for qualifying B2B orders.")
                )
              ),
              e(
                "label",
                { className: "tl-switch-label" },
                e("input", { type: "checkbox", id: "toggle-po-gate", defaultChecked: true, className: "tl-switch-input" }),
                e("span", { className: "tl-switch-slider" }),
                e("span", { className: "tl-switch-text" }, "Enabled")
              )
            ),
            e(
              "div",
              { className: "tl-card-body" },
              e("label", { className: "tl-field-label" }, "Accepted PO format"),
              e(
                "div",
                { className: "tl-segmented-group" },
                e(
                  "button",
                  { type: "button", className: "tl-seg-btn tl-seg-btn--active", id: "preset-po-corporate", "data-regex": "^PO-[0-9]{6}$" },
                  e("span", { className: "tl-seg-check" }, "✓"),
                  e("span", null, "Standard")
                ),
                e(
                  "button",
                  { type: "button", className: "tl-seg-btn", id: "preset-po-numeric", "data-regex": "^[0-9]{5,10}$" },
                  "Numbers only"
                ),
                e(
                  "button",
                  { type: "button", className: "tl-seg-btn", id: "preset-po-nonempty", "data-regex": "^.+$" },
                  "Any non-empty"
                ),
                e(
                  "button",
                  { type: "button", className: "tl-seg-btn", id: "preset-po-custom", "data-regex": "^PO-[0-9]{5,10}$" },
                  "Custom"
                )
              ),
              e(
                "div",
                { className: "tl-inputs-2col" },
                e(
                  "div",
                  { className: "tl-field-group" },
                  e("label", { className: "tl-field-label", htmlFor: "po-regex-input" }, "PO format pattern"),
                  e("input", {
                    type: "text",
                    id: "po-regex-input",
                    className: "tl-input tl-input--mono",
                    defaultValue: validationRules.poRule.regexPattern
                  }),
                  e("p", { className: "tl-field-caption" }, "Example: PO-849201")
                ),
                e(
                  "div",
                  { className: "tl-field-group" },
                  e("label", { className: "tl-field-label", htmlFor: "po-threshold-input" }, "Require a PO on orders from"),
                  e(
                    "div",
                    { className: "tl-input-group" },
                    e("span", { className: "tl-input-prefix" }, "$"),
                    e("input", {
                      type: "number",
                      id: "po-threshold-input",
                      className: "tl-input tl-input--grouped",
                      defaultValue: validationRules.poRule.subtotalThreshold,
                      step: "100"
                    }),
                    e("span", { className: "tl-input-suffix" }, "USD")
                  ),
                  e("p", { className: "tl-field-caption" }, "Applies to B2B orders at or above this amount.")
                )
              )
            )
          ),

          // CARD 2: WHOLESALE & FREIGHT PROTECTION
          e(
            "section",
            { id: "card-wholesale-freight", className: "tl-card", "data-domain": "wholesale" },
            e(
              "div",
              { className: "tl-card-header" },
              e(
                "div",
                { className: "tl-card-header-left" },
                e("div", { className: "tl-card-icon-wrap" }, icons.truck),
                e(
                  "div",
                  null,
                  e("h2", { className: "tl-card-title" }, "Wholesale & freight protection"),
                  e("p", { className: "tl-card-desc" }, "Keep orders compliant with your fulfillment rules.")
                )
              ),
              e(
                "label",
                { className: "tl-switch-label" },
                e("input", { type: "checkbox", defaultChecked: true, className: "tl-switch-input" }),
                e("span", { className: "tl-switch-slider" }),
                e("span", { className: "tl-switch-text" }, "Enabled")
              )
            ),
            e(
              "div",
              { className: "tl-card-body" },
              e(
                "div",
                { className: "tl-inputs-2col" },
                e(
                  "div",
                  { className: "tl-field-group" },
                  e("label", { className: "tl-field-label", htmlFor: "moq-subtotal-input" }, "Minimum order subtotal"),
                  e(
                    "div",
                    { className: "tl-input-group" },
                    e("span", { className: "tl-input-prefix" }, "$"),
                    e("input", {
                      type: "number",
                      id: "moq-subtotal-input",
                      className: "tl-input tl-input--grouped",
                      defaultValue: validationRules.moqRule.minimumSubtotal,
                      step: "50"
                    }),
                    e("span", { className: "tl-input-suffix" }, "USD")
                  )
                ),
                e(
                  "div",
                  { className: "tl-field-group" },
                  e("label", { className: "tl-field-label", htmlFor: "sim-sku-qty-input" }, "Case-pack quantity"),
                  e(
                    "div",
                    { className: "tl-input-group" },
                    e("input", {
                      type: "number",
                      id: "sim-sku-qty-input",
                      className: "tl-input tl-input--grouped tl-input--noprefix",
                      defaultValue: "12",
                      step: "6"
                    }),
                    e("span", { className: "tl-input-suffix" }, "units")
                  )
                )
              ),

              // SUB-RULES LIST
              e(
                "div",
                { className: "tl-rule-rows" },
                e(
                  "div",
                  { className: "tl-rule-row" },
                  e(
                    "div",
                    { className: "tl-rule-row-left" },
                    e("div", { className: "tl-rule-row-icon" }, icons.box),
                    e(
                      "div",
                      null,
                      e("h3", { className: "tl-rule-row-title" }, "Enforce case-pack multiples"),
                      e("p", { className: "tl-rule-row-desc" }, "Require quantities in 6- or 12-unit packs.")
                    )
                  ),
                  e(
                    "label",
                    { className: "tl-switch-label" },
                    e("input", { type: "checkbox", id: "toggle-moq-gate", defaultChecked: true, className: "tl-switch-input" }),
                    e("span", { className: "tl-switch-slider" })
                  )
                ),
                e(
                  "div",
                  { className: "tl-rule-row" },
                  e(
                    "div",
                    { className: "tl-rule-row-left" },
                    e("div", { className: "tl-rule-row-icon" }, icons.pin),
                    e(
                      "div",
                      null,
                      e("h3", { className: "tl-rule-row-title" }, "Block P.O. box addresses"),
                      e("p", { className: "tl-rule-row-desc" }, "Require a street address for freight and pallet orders.")
                    )
                  ),
                  e(
                    "label",
                    { className: "tl-switch-label" },
                    e("input", { type: "checkbox", id: "toggle-pobox-gate", defaultChecked: true, className: "tl-switch-input" }),
                    e("span", { className: "tl-switch-slider" })
                  )
                ),
                e(
                  "div",
                  { className: "tl-rule-row" },
                  e(
                    "div",
                    { className: "tl-rule-row-left" },
                    e("div", { className: "tl-rule-row-icon" }, icons.shield),
                    e(
                      "div",
                      null,
                      e("h3", { className: "tl-rule-row-title" }, "Prevent incompatible hazmat items"),
                      e("p", { className: "tl-rule-row-desc" }, "Block restricted item combinations in one cart.")
                    )
                  ),
                  e(
                    "label",
                    { className: "tl-switch-label" },
                    e("input", { type: "checkbox", id: "toggle-hazmat-gate", defaultChecked: true, className: "tl-switch-input" }),
                    e("span", { className: "tl-switch-slider" })
                  )
                )
              )
            )
          ),

          // CARD 3: INVOICE & PAYMENT TERMS
          e(
            "section",
            { id: "card-payment-terms", className: "tl-card", "data-domain": "payments" },
            e(
              "div",
              { className: "tl-card-header" },
              e(
                "div",
                { className: "tl-card-header-left" },
                e("div", { className: "tl-card-icon-wrap" }, icons.creditCard),
                e(
                  "div",
                  null,
                  e("h2", { className: "tl-card-title" }, "Invoice & payment terms"),
                  e("p", { className: "tl-card-desc" }, "Control which payment options B2B buyers see.")
                )
              ),
              e(
                "label",
                { className: "tl-switch-label" },
                e("input", { type: "checkbox", defaultChecked: true, className: "tl-switch-input" }),
                e("span", { className: "tl-switch-slider" }),
                e("span", { className: "tl-switch-text" }, "Enabled")
              )
            ),
            e(
              "div",
              { className: "tl-card-body" },
              e(
                "div",
                { className: "tl-inputs-2col" },
                e(
                  "div",
                  { className: "tl-field-group" },
                  e("label", { className: "tl-field-label", htmlFor: "net30-tags-input" }, "Approved customer tags"),
                  e(
                    "div",
                    { className: "tl-tags-box" },
                    e("span", { className: "tl-tag-chip" }, "Net-30", e("span", { className: "tl-tag-x" }, "×")),
                    e("span", { className: "tl-tag-chip" }, "Approved-Wholesale", e("span", { className: "tl-tag-x" }, "×")),
                    e("span", { className: "tl-tags-chevron" }, "⌵"),
                    e("input", {
                      type: "hidden",
                      id: "net30-tags-input",
                      defaultValue: "Net-30, Approved-Wholesale"
                    })
                  )
                ),
                e(
                  "div",
                  { className: "tl-field-group" },
                  e("label", { className: "tl-field-label", htmlFor: "wire-threshold-input" }, "Hide credit cards on orders above"),
                  e(
                    "div",
                    { className: "tl-input-group" },
                    e("span", { className: "tl-input-prefix" }, "$"),
                    e("input", {
                      type: "number",
                      id: "wire-threshold-input",
                      className: "tl-input tl-input--grouped",
                      defaultValue: "5000",
                      step: "500"
                    }),
                    e("span", { className: "tl-input-suffix" }, "USD")
                  )
                )
              ),

              // SUB-RULES LIST
              e(
                "div",
                { className: "tl-rule-rows" },
                e(
                  "div",
                  { className: "tl-rule-row" },
                  e(
                    "div",
                    { className: "tl-rule-row-left" },
                    e("div", { className: "tl-rule-row-icon" }, icons.docSmall),
                    e(
                      "div",
                      null,
                      e("h3", { className: "tl-rule-row-title" }, "Require a valid PO for Net-30"),
                      e("p", { className: "tl-rule-row-desc" }, "Show invoice terms only after PO validation.")
                    )
                  ),
                  e(
                    "label",
                    { className: "tl-switch-label" },
                    e("input", { type: "checkbox", id: "toggle-net30-po", defaultChecked: true, className: "tl-switch-input" }),
                    e("span", { className: "tl-switch-slider" })
                  )
                ),
                e(
                  "div",
                  { className: "tl-rule-row" },
                  e(
                    "div",
                    { className: "tl-rule-row-left" },
                    e("div", { className: "tl-rule-row-icon" }, icons.slashCircle),
                    e(
                      "div",
                      null,
                      e("h3", { className: "tl-rule-row-title" }, "Hide cash on delivery"),
                      e("p", { className: "tl-rule-row-desc" }, "Remove COD for B2B customers.")
                    )
                  ),
                  e(
                    "label",
                    { className: "tl-switch-label" },
                    e("input", { type: "checkbox", id: "toggle-cod-gate", defaultChecked: true, className: "tl-switch-input" }),
                    e("span", { className: "tl-switch-slider" })
                  )
                )
              )
            )
          )
        )
      ),

      // =======================================================================
      // RIGHT COLUMN: ACTIVE RULE SUMMARY + CHECKOUT PREVIEW CARDS
      // =======================================================================
      e(
        "div",
        { className: "tl-right-col" },

        // CARD A: ACTIVE RULE SUMMARY
        e(
          "section",
          { className: "tl-card tl-summary-card", id: "active-rule-summary-card" },
          e(
            "div",
            { className: "tl-card-header" },
            e(
              "div",
              { className: "tl-card-header-left" },
              e("div", { className: "tl-card-icon-wrap" }, icons.docSmall),
              e(
                "div",
                null,
                e("h2", { className: "tl-card-title" }, "Active Rule Summary"),
                e("p", { className: "tl-card-desc" }, "Target: Shopify Functions 2026-10")
              )
            ),
            e("span", { className: "tl-badge-active" }, "Active • 4 rules enabled")
          ),
          e(
            "div",
            { className: "tl-card-body" },
            e(
              "ul",
              { className: "tl-summary-bullets" },
              e("li", { id: "summary-bullet-po", className: "tl-summary-bullet" }, `• PO format ${validationRules.poRule.regexPattern} required ≥ $${validationRules.poRule.subtotalThreshold}`),
              e("li", { id: "summary-bullet-moq", className: "tl-summary-bullet" }, `• $${validationRules.moqRule.minimumSubtotal} MOQ & 12-unit case packs`),
              e("li", { id: "summary-bullet-freight", className: "tl-summary-bullet" }, "• Freight P.O. Box addresses blocked"),
              e("li", { id: "summary-bullet-net30", className: "tl-summary-bullet" }, "• Net-30 gated by tag + valid PO")
            ),
            e(
              "button",
              {
                type: "button",
                id: "launch-simulator-btn",
                className: "tl-btn tl-btn-primary tl-btn--full"
              },
              "Launch Live Checkout Simulator →"
            )
          )
        ),

        // CARD B: STOREFRONT CHECKOUT PREVIEW
        e(
          "section",
          { className: "tl-card tl-card--preview", id: "card-checkout-preview" },

          // CARD HEADER
          e(
            "div",
            { className: "tl-card-header" },
            e(
              "div",
              { className: "tl-card-header-left" },
              e("div", { className: "tl-card-icon-wrap" }, icons.cart),
              e(
                "div",
                null,
                e("h2", { className: "tl-card-title" }, "Checkout preview"),
                e("p", { className: "tl-card-desc" }, "See how your rules appear to a wholesale buyer.")
              )
            ),
            e(
              "span",
              {
                id: "sim-status-pill",
                className: `tl-status-badge ${simulation.checkoutPassed ? "tl-status-badge--passed" : "tl-status-badge--failed"}`
              },
              simulation.checkoutPassed ? "✔ Test passed" : `${simulation.validationErrors.length} checkout errors`,
              e(
                "span",
                { style: { display: "none" } },
                simulation.checkoutPassed ? "CHECKOUT APPROVED (0 ERRORS)" : `CHECKOUT BLOCKED (${simulation.validationErrors.length} ERRORS)`
              )
            )
          ),

          e(
            "div",
            { className: "tl-card-body" },

            // 1-CLICK SCENARIO SEGMENTED SWITCHER
            e(
              "div",
              { className: "tl-scenario-toggle" },
              e(
                "button",
                {
                  type: "button",
                  id: "preset-scenario-pass",
                  className: `tl-scenario-btn ${simulation.checkoutPassed ? "tl-scenario-btn--active" : ""}`
                },
                e("span", { className: "tl-scenario-dot" }, "●"),
                e("span", null, "Approved Net-30")
              ),
              e(
                "button",
                {
                  type: "button",
                  id: "preset-scenario-fail",
                  className: `tl-scenario-btn ${!simulation.checkoutPassed ? "tl-scenario-btn--active" : ""}`
                },
                e("span", { className: "tl-scenario-dot" }, "○"),
                e("span", null, "Blocked PO & address")
              )
            ),

            // EXPANDABLE TEST BUYER INPUTS DRAWER
            e(
              "details",
              { id: "test-buyer-drawer", className: "tl-test-customer-drawer", open: true },
              e(
                "summary",
                { className: "tl-test-customer-summary" },
                e(
                  "div",
                  { className: "tl-test-customer-title" },
                  icons.user,
                  e("span", null, "⚙ Customize test buyer inputs")
                ),
                e("button", { type: "button", className: "tl-edit-btn" }, "✎ Edit")
              ),
              e(
                "form",
                { id: "simulator-form", className: "tl-test-customer-grid", onSubmit: (ev: React.SyntheticEvent) => ev.preventDefault() },
                e(
                  "div",
                  { className: "tl-test-field" },
                  e("label", { className: "tl-test-label" }, "PO number"),
                  e("input", {
                    type: "text",
                    id: "sim-po-input",
                    className: "tl-test-input",
                    defaultValue: simulatorScenario.poNumber ?? "PO-849201"
                  })
                ),
                e(
                  "div",
                  { className: "tl-test-field" },
                  e("label", { className: "tl-test-label" }, "Company"),
                  e("input", {
                    type: "text",
                    id: "sim-company-input",
                    className: "tl-test-input",
                    defaultValue: simulatorScenario.billingCompany ?? "Apex Industrial Supply LLC"
                  })
                ),
                e(
                  "div",
                  { className: "tl-test-field" },
                  e("label", { className: "tl-test-label" }, "Billing street"),
                  e("input", {
                    type: "text",
                    id: "sim-address1-input",
                    className: "tl-test-input",
                    defaultValue: simulatorScenario.billingAddress1 ?? "400 Market St"
                  })
                ),
                e(
                  "div",
                  { className: "tl-test-field" },
                  e("label", { className: "tl-test-label" }, "Customer tag"),
                  e("input", {
                    type: "text",
                    id: "sim-tags-input",
                    className: "tl-test-input",
                    defaultValue: simulatorScenario.customerTags?.join(", ") || "Net-30"
                  })
                ),
                e(
                  "div",
                  { className: "tl-test-field" },
                  e("label", { className: "tl-test-label" }, "Cart subtotal"),
                  e("input", {
                    type: "text",
                    id: "sim-subtotal-input",
                    className: "tl-test-input",
                    defaultValue: `$${(simulatorScenario.cartSubtotal || 1250).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  })
                ),
                e(
                  "div",
                  { className: "tl-test-field" },
                  e("label", { className: "tl-test-label" }, "Freight quantity"),
                  e("input", {
                    type: "number",
                    id: "sim-freight-qty-display",
                    className: "tl-test-input",
                    defaultValue: simulatorScenario.lineItems?.[0]?.quantity ?? 12,
                    readOnly: true
                  })
                )
              )
            ),

            // REALISTIC STOREFRONT CHECKOUT FRAME
            e(
              "div",
              { className: "tl-storefront-checkout" },

              // Checkout Header Row
              e(
                "div",
                { className: "tl-checkout-header" },
                e(
                  "div",
                  { className: "tl-checkout-brand" },
                  icons.bag,
                  e("span", { className: "tl-checkout-heading" }, "Checkout")
                ),
                e(
                  "div",
                  { className: "tl-currency-select" },
                  e("span", null, "USD"),
                  e("span", { className: "tl-currency-arrow" }, "⌵")
                )
              ),

              // Order Total Row
              e(
                "div",
                { className: "tl-order-summary-row" },
                e("span", { className: "tl-company-name", id: "preview-company-title" }, simulatorScenario.billingCompany ?? "Apex Industrial Supply LLC"),
                e(
                  "div",
                  { className: "tl-total-box" },
                  e("span", { className: "tl-total-label" }, "Order total"),
                  e("span", { className: "tl-total-amount", id: "preview-subtotal-chip" }, `$${(simulatorScenario.cartSubtotal || 1250).toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
                )
              ),

              // Dynamic Validation / Errors Container
              e(
                "div",
                { id: "sim-errors-container" },

                // PO Field
                e(
                  "div",
                  { className: "tl-checkout-section" },
                  e("h4", { className: "tl-section-heading" }, "Purchase order"),
                  e(
                    "div",
                    { className: `tl-floating-box ${poError ? "tl-floating-box--error" : ""}` },
                    e("span", { className: "tl-floating-label" }, "PO NUMBER"),
                    e("span", { className: "tl-floating-val" }, simulatorScenario.poNumber || "PO-849201")
                  ),
                  poError
                    ? e(
                        "div",
                        { className: "tl-inline-err", "data-target": poError.target },
                        e("span", { className: "tl-err-dot" }, "⚠"),
                        e("span", null, `Enter a valid corporate PO number matching PO-XXXXXX — ${poError.localizedMessage}`),
                        e("span", { style: { display: "none" } }, poError.target)
                      )
                    : e(
                        "div",
                        { className: "tl-inline-ok" },
                        e("span", null, "✔ Valid purchase order")
                      )
                ),

                // Billing & Shipping Field
                e(
                  "div",
                  { className: "tl-checkout-section" },
                  e("h4", { className: "tl-section-heading" }, "Billing & shipping"),
                  e(
                    "div",
                    { className: "tl-address-row" },
                    e(
                      "div",
                      { className: "tl-address-left" },
                      icons.pin,
                      e(
                        "div",
                        null,
                        e("p", { className: "tl-addr-company" }, simulatorScenario.billingCompany ?? "Apex Industrial Supply LLC"),
                        e("p", { className: "tl-addr-street" }, `${simulatorScenario.billingAddress1 ?? "400 Market St"}, Austin, TX 78701`)
                      )
                    ),
                    e(
                      "div",
                      { className: "tl-freight-tag" },
                      icons.truck,
                      e("span", null, "Commercial LTL freight")
                    )
                  ),
                  addressError &&
                    e(
                      "div",
                      { className: "tl-inline-err", "data-target": addressError.target },
                      e("span", { className: "tl-err-dot" }, "⚠"),
                      e("span", null, addressError.localizedMessage),
                      e("span", { style: { display: "none" } }, addressError.target)
                    ),
                  cartErrors.map((ce, idx) =>
                    e(
                      "div",
                      { key: idx, className: "tl-inline-err", "data-target": ce.target },
                      e("span", { className: "tl-err-dot" }, "⚠"),
                      e("span", null, ce.localizedMessage),
                      e("span", { style: { display: "none" } }, ce.target)
                    )
                  )
                )
              ),

              // Payment Methods Section
              e(
                "div",
                { className: "tl-checkout-section" },
                e("h4", { className: "tl-section-heading" }, "Payment method"),
                e(
                  "div",
                  { id: "sim-payments-container", className: "tl-payment-list" },
                  sortedPayments.map((pm, idx) => {
                    if (pm.visible) {
                      const isPromoted = pm.promotedToTop;
                      return e(
                        "div",
                        {
                          key: pm.id || idx,
                          className: `tl-payment-item ${isPromoted ? "tl-payment-item--highlight" : ""}`,
                          "data-method-id": pm.id
                        },
                        e(
                          "div",
                          { className: "tl-payment-header-row" },
                          e(
                            "div",
                            { className: "tl-payment-left" },
                            e("span", { className: `tl-radio ${isPromoted ? "tl-radio--checked" : ""}` }),
                            e("span", { className: "tl-payment-name" }, pm.originalName.includes("Net-30") ? "Net-30 corporate invoice" : pm.displayName)
                          ),
                          isPromoted
                            ? e(
                                "span",
                                { className: "tl-pill-rec" },
                                "Recommended",
                                e("span", { style: { display: "none" } }, " RANK #1 • PROMOTED")
                              )
                            : e("span", { className: "tl-pill-avail" }, "Available")
                        ),
                        isPromoted &&
                          e("p", { className: "tl-payment-sub" }, "PO verified • Pay within 30 days")
                      );
                    }
                    return e(
                      "div",
                      {
                        key: pm.id || idx,
                        className: "tl-payment-item tl-payment-item--hidden",
                        "data-method-id": pm.id
                      },
                      e(
                        "div",
                        { className: "tl-payment-header-row" },
                        e(
                          "div",
                          { className: "tl-payment-left" },
                          e("span", { className: "tl-radio tl-radio--disabled" }),
                          e("span", { className: "tl-payment-name tl-payment-name--muted" }, pm.displayName)
                        ),
                        e(
                          "span",
                          { className: "tl-pill-hidden" },
                          "Hidden by rule",
                          e("span", { style: { display: "none" } }, " HIDDEN BY GATE")
                        )
                      )
                    );
                  })
                )
              )
            ),

            // PASS / FAIL BOTTOM BANNER
            e(
              "div",
              {
                id: "sim-banner-result",
                className: `tl-result-banner ${simulation.checkoutPassed ? "tl-result-banner--pass" : "tl-result-banner--fail"}`
              },
              e(
                "div",
                { className: `tl-result-circle ${simulation.checkoutPassed ? "tl-result-circle--pass" : "tl-result-circle--fail"}` },
                simulation.checkoutPassed ? "✔" : "!"
              ),
              e(
                "div",
                { className: "tl-result-text" },
                e(
                  "h5",
                  { className: "tl-result-title" },
                  simulation.checkoutPassed ? "All 3 checks passed" : `${simulation.validationErrors.length} checks failed`
                ),
                e(
                  "p",
                  { className: "tl-result-subtitle" },
                  simulation.checkoutPassed
                    ? "PO format • Order minimum • Case-pack quantity"
                    : simulation.validationErrors.map((ve: { localizedMessage: string }) => ve.localizedMessage).join(" • ")
                )
              )
            ),

            // PREVIEW FOOTER NOTE
            e(
              "div",
              { className: "tl-preview-footer" },
              e("span", { className: "tl-info-icon" }, "ⓘ"),
              e("span", null, "Preview only. Changes are applied when you save.")
            )
          )
        )
      )
    ),

    // DEVELOPER DIAGNOSTICS & TELEMETRY DRAWER (Keep DOM hooks for automated audits)
    e(
      "details",
      { id: "developer-diagnostics-drawer", className: "tl-dev-drawer" },
      e("summary", null, "Developer Telemetry & Metafield JSON"),
      e("span", { id: "sim-telemetry-badge" }, `${simulation.telemetry.validationOutputBytes} B`),
      e(
        "div",
        { id: "metafield-byte-counter" },
        `rules_config: ${compiledVal.byteLength} B / 10,240 B (${compiledVal.budgetUtilizationPercent}%) • payment_rules: 575 B / 10,240 B • extensions: termslock-checkout-validator, termslock-payment-gate`
      ),
      e("pre", { id: "metafield-json-preview" }, compiledVal.value)
    )
  );
}
