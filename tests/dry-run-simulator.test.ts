import { describe, expect, it } from "vitest";
import { executeDryRunSimulation } from "../web/simulator/dry-run-simulator.ts";
import { renderEmbeddedRuleBuilderHtml } from "../web/ui/rule-builder-app.ts";

describe("Milestone 4: Interactive Dry-Run Checkout Simulator & Embedded Admin UI", () => {
  it("28. simulates a compliant Net-30 B2B checkout with PO-10492 and unlocks Net-30 Corporate Invoice", () => {
    const report = executeDryRunSimulation({
      cartSubtotal: 1250.0,
      customerTags: ["Net-30"],
      purchasingCompanyName: "Apex Industrial Supply LLC",
      poNumber: "PO-10492",
      billingCompany: "Apex Industrial Supply LLC",
      billingAddress1: "450 Commerce Pkwy"
    });

    expect(report.checkoutPassed).toBe(true);
    expect(report.validationErrors).toHaveLength(0);

    const net30Status = report.paymentMethodsPreview.find((pm) =>
      pm.originalName.includes("Net-30")
    );
    expect(net30Status?.visible).toBe(true);
    expect(net30Status?.promotedToTop).toBe(true);
    expect(net30Status?.displayName).toBe(
      "Net-30 Corporate Invoice (PO Verified)"
    );
  });

  it("29. simulates missing PO number and missing billing company, returning $.cart.poNumber and $.cart.billingAddress.company errors", () => {
    const report = executeDryRunSimulation({
      cartSubtotal: 850.0,
      customerTags: ["Net-30"],
      purchasingCompanyName: "Apex Industrial Supply LLC",
      poNumber: "",
      billingCompany: ""
    });

    expect(report.checkoutPassed).toBe(false);
    expect(
      report.validationErrors.some((e) => e.target === "$.cart.poNumber")
    ).toBe(true);
    expect(
      report.validationErrors.some(
        (e) => e.target === "$.cart.billingAddress.company"
      )
    ).toBe(true);

    const net30Status = report.paymentMethodsPreview.find((pm) =>
      pm.originalName.includes("Net-30")
    );
    expect(net30Status?.visible).toBe(false);
  });

  it("30. simulates Freight SKU with PO Box address and under-MOQ wholesale subtotal", () => {
    const report = executeDryRunSimulation({
      cartSubtotal: 299.0,
      customerTags: ["B2B"],
      purchasingCompanyName: "Apex Industrial Supply LLC",
      poNumber: "PO-10492",
      billingCompany: "Apex Industrial Supply LLC",
      billingAddress1: "PO Box 550",
      lineItems: [
        {
          sku: "FREIGHT-COMPRESSOR",
          quantity: 1,
          productTags: ["Freight"]
        }
      ]
    });

    expect(report.checkoutPassed).toBe(false);
    expect(
      report.validationErrors.some(
        (e) => e.target === "$.cart.billingAddress.address1"
      )
    ).toBe(true);
    expect(
      report.validationErrors.some((e) => e.target === "$.cart")
    ).toBe(true);
  });

  it("31. reports live metafield and output byte telemetry below Shopify Function limits", () => {
    const report = executeDryRunSimulation({
      cartSubtotal: 6200.0,
      customerTags: ["Net-30"],
      poNumber: "PO-998877",
      billingCompany: "Global Logistics Inc"
    });

    expect(report.telemetry.validationMetafieldBytes).toBeLessThan(10_240);
    expect(report.telemetry.paymentMetafieldBytes).toBeLessThan(10_240);
    expect(report.telemetry.validationOutputBytes).toBeLessThan(20_480);
    expect(report.telemetry.paymentOutputBytes).toBeLessThan(20_480);
  });

  it("32. renders the Embedded Admin Rule Builder & Simulator UI with Polaris design tokens and Onest typography", () => {
    const html = renderEmbeddedRuleBuilderHtml({
      activePlan: "PLUS_ENTERPRISE",
      simulatorScenario: {
        cartSubtotal: 1250.0,
        customerTags: ["Net-30"],
        poNumber: "INVALID-PO",
        billingCompany: "Apex Industrial Supply LLC"
      }
    });

    expect(html).toContain("--p-color-interactive: #008060");
    expect(html).toContain("Onest");
    expect(html).toContain("$.cart.poNumber");
    expect(html).toContain("Shopify Plus & Enterprise Wholesale Plan");
  });
});
