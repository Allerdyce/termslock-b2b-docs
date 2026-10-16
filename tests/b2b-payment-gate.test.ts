import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAYMENT_RULES_CONFIG,
  run
} from "../extensions/b2b-payment-gate/src/index.ts";
import type { PaymentRunInput } from "../extensions/b2b-payment-gate/src/types.ts";

const SAMPLE_METHODS = [
  { id: "pm-card", name: "Shopify Payments (Credit Card)" },
  { id: "pm-net30", name: "Net-30 Invoice" },
  { id: "pm-ach", name: "ACH / Wire Transfer" },
  { id: "pm-cod", name: "Cash on Delivery (COD)" }
];

function buildPaymentInput(
  overrides: Partial<PaymentRunInput["cart"]> = {}
): PaymentRunInput {
  return {
    cart: {
      poNumber: "PO-10492",
      cost: {
        totalAmount: {
          amount: "1200.00"
        }
      },
      buyerIdentity: {
        customer: {
          hasAnyTag: true,
          tags: ["Net-30"]
        },
        purchasingCompany: {
          company: {
            id: "gid://shopify/Company/101"
          }
        }
      },
      ...overrides
    },
    paymentMethods: SAMPLE_METHODS,
    paymentCustomization: {
      metafield: {
        value: JSON.stringify(DEFAULT_PAYMENT_RULES_CONFIG)
      }
    }
  };
}

describe("Milestone 2: b2b-payment-gate Shopify Function (2026-10)", () => {
  it("13. hides Net-30 Invoice when customer is untagged (retail buyer)", () => {
    const input = buildPaymentInput({
      poNumber: "PO-10492",
      cost: { totalAmount: { amount: "450.00" } },
      buyerIdentity: {
        customer: { hasAnyTag: false, tags: [] },
        purchasingCompany: null
      }
    });
    const result = run(input);
    expect(result.operations).toContainEqual({
      hide: { paymentMethodId: "pm-net30" }
    });
  });

  it("14. hides Net-30 Invoice when customer has Net-30 tag but cart.poNumber is missing or invalid", () => {
    const input = buildPaymentInput({
      poNumber: "BAD-PO"
    });
    const result = run(input);
    expect(result.operations).toContainEqual({
      hide: { paymentMethodId: "pm-net30" }
    });
  });

  it("15. unlocks, renames, and promotes Net-30 Invoice to index 0 when buyer has Net-30 tag AND valid PO-10492", () => {
    const input = buildPaymentInput({
      poNumber: "PO-10492"
    });
    const result = run(input);
    expect(result.operations).not.toContainEqual({
      hide: { paymentMethodId: "pm-net30" }
    });
    expect(result.operations).toContainEqual({
      rename: {
        paymentMethodId: "pm-net30",
        name: "Net-30 Corporate Invoice (PO Verified)"
      }
    });
    expect(result.operations).toContainEqual({
      move: {
        paymentMethodId: "pm-net30",
        index: 0
      }
    });
  });

  it("16. hides Cash on Delivery (COD) for B2B orders or orders >= $1,000", () => {
    const input = buildPaymentInput();
    const result = run(input);
    expect(result.operations).toContainEqual({
      hide: { paymentMethodId: "pm-cod" }
    });
  });

  it("17. hides high-fee Credit Card gateways when cart total exceeds $5,000.00 threshold", () => {
    const input = buildPaymentInput({
      cost: { totalAmount: { amount: "6500.00" } }
    });
    const result = run(input);
    expect(result.operations).toContainEqual({
      hide: { paymentMethodId: "pm-card" }
    });
  });

  it("18. hides Credit Card gateways when buyer has Wire-Only tag even below $5,000", () => {
    const input = buildPaymentInput({
      cost: { totalAmount: { amount: "1500.00" } },
      buyerIdentity: {
        customer: {
          hasAnyTag: true,
          tags: ["Net-30", "Wire-Only"]
        },
        purchasingCompany: { company: { id: "gid://shopify/Company/101" } }
      }
    });
    const result = run(input);
    expect(result.operations).toContainEqual({
      hide: { paymentMethodId: "pm-card" }
    });
  });

  it("19. returns empty operations array when payment rule config is disabled", () => {
    const input = buildPaymentInput();
    input.paymentCustomization = {
      metafield: {
        value: JSON.stringify({
          ...DEFAULT_PAYMENT_RULES_CONFIG,
          enabled: false
        })
      }
    };
    const result = run(input);
    expect(result.operations).toEqual([]);
  });
});
