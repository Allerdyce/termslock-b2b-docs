import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES_CONFIG,
  MAX_OUTPUT_BYTES,
  run
} from "../extensions/b2b-checkout-validator/src/index.ts";
import type {
  RunInput,
  TermsLockRulesConfig
} from "../extensions/b2b-checkout-validator/src/types.ts";

function buildBaseB2BInput(overrides: Partial<RunInput["cart"]> = {}): RunInput {
  return {
    cart: {
      poNumber: "PO-10492",
      billingAddress: {
        company: "Apex Industrial Supply LLC",
        address1: "450 Commerce Pkwy",
        city: "Austin",
        provinceCode: "TX",
        countryCode: "US",
        zip: "78701"
      },
      cost: {
        subtotalAmount: {
          amount: "1250.00"
        }
      },
      buyerIdentity: {
        customer: {
          hasAnyTag: true,
          numberOfOrders: 8,
          tags: ["B2B", "Net-30"]
        },
        purchasingCompany: {
          company: {
            id: "gid://shopify/Company/500",
            name: "Apex Industrial Supply LLC"
          },
          location: {
            id: "gid://shopify/CompanyLocation/501"
          }
        }
      },
      lines: [
        {
          quantity: 12,
          merchandise: {
            __typename: "ProductVariant",
            id: "gid://shopify/ProductVariant/1001",
            sku: "CASE6-VALVE-200",
            product: {
              hasAnyTag: true,
              tags: ["Wholesale-Case-6"]
            }
          }
        }
      ],
      ...overrides
    },
    cartValidation: {
      metafield: {
        value: JSON.stringify(DEFAULT_RULES_CONFIG)
      }
    }
  };
}

describe("Milestone 1: b2b-checkout-validator Shopify Function (2026-10)", () => {
  it("1. passes a compliant B2B order with valid PO-10492, commercial billing address, and 12x case-pack quantity", () => {
    const input = buildBaseB2BInput();
    const result = run(input);
    expect(result.errors).toEqual([]);
  });

  it("2. blocks missing PO number for B2B purchasingCompany and targets $.cart.poNumber directly", () => {
    const input = buildBaseB2BInput({ poNumber: "" });
    const result = run(input);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.target).toBe("$.cart.poNumber");
    expect(result.errors[0]?.localizedMessage).toContain(
      "valid Purchase Order (PO) number is required"
    );
  });

  it("3. blocks malformed PO number failing corporate regex (^PO-[0-9]{5,10}$) on $.cart.poNumber", () => {
    const input = buildBaseB2BInput({ poNumber: "INV-99" });
    const result = run(input);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.target).toBe("$.cart.poNumber");
    expect(result.errors[0]?.localizedMessage).toContain(
      "Invalid PO number format"
    );
  });

  it("4. enforces PO number requirement when retail/untagged cart subtotal exceeds $1,000 threshold", () => {
    const input = buildBaseB2BInput({
      poNumber: null,
      cost: { subtotalAmount: { amount: "1450.00" } },
      buyerIdentity: {
        customer: { hasAnyTag: false, numberOfOrders: 1 },
        purchasingCompany: null
      }
    });
    const result = run(input);
    expect(result.errors.some((e) => e.target === "$.cart.poNumber")).toBe(true);
  });

  it("5. blocks PO Box billing addresses when cart contains a Freight/Pallet SKU and targets $.cart.billingAddress.address1", () => {
    const input = buildBaseB2BInput({
      billingAddress: {
        company: "Apex Industrial Supply LLC",
        address1: "P.O. Box 8492",
        city: "Austin",
        provinceCode: "TX",
        countryCode: "US",
        zip: "78701"
      },
      lines: [
        {
          quantity: 1,
          merchandise: {
            __typename: "ProductVariant",
            id: "gid://shopify/ProductVariant/2002",
            sku: "FREIGHT-GENERATOR-500",
            product: {
              hasAnyTag: true,
              tags: ["Freight", "Pallet"]
            }
          }
        }
      ]
    });
    const result = run(input);
    const addrError = result.errors.find(
      (e) => e.target === "$.cart.billingAddress.address1"
    );
    expect(addrError).toBeDefined();
    expect(addrError?.localizedMessage).toContain("PO Box");
  });

  it("6. requires non-empty billingAddress.company for B2B orders and targets $.cart.billingAddress.company", () => {
    const input = buildBaseB2BInput({
      billingAddress: {
        company: "   ",
        address1: "450 Commerce Pkwy",
        city: "Austin",
        provinceCode: "TX",
        countryCode: "US",
        zip: "78701"
      }
    });
    const result = run(input);
    const companyError = result.errors.find(
      (e) => e.target === "$.cart.billingAddress.company"
    );
    expect(companyError).toBeDefined();
    expect(companyError?.localizedMessage).toContain("Company Legal Name");
  });

  it("7. enforces VAT/Tax ID format inside billingAddress.company when requireTaxIdPrefixInCompany is enabled", () => {
    const customConfig: TermsLockRulesConfig = {
      ...DEFAULT_RULES_CONFIG,
      billingRule: {
        ...DEFAULT_RULES_CONFIG.billingRule,
        requireTaxIdPrefixInCompany: true
      }
    };
    const input = buildBaseB2BInput({
      billingAddress: {
        company: "Apex Industrial Supply LLC", // Missing VAT-XXXX
        address1: "450 Commerce Pkwy",
        city: "Austin",
        provinceCode: "TX",
        countryCode: "US",
        zip: "78701"
      }
    });
    input.cartValidation = {
      metafield: { value: JSON.stringify(customConfig) }
    };

    const result = run(input);
    expect(
      result.errors.some((e) => e.target === "$.cart.billingAddress.company")
    ).toBe(true);
  });

  it("8. validates $.cart.billingAddress.countryCode, provinceCode, and zip when configured for B2B", () => {
    const customConfig: TermsLockRulesConfig = {
      ...DEFAULT_RULES_CONFIG,
      billingRule: {
        ...DEFAULT_RULES_CONFIG.billingRule,
        allowedCountries: ["US", "CA"]
      }
    };
    const input = buildBaseB2BInput({
      billingAddress: {
        company: "Apex UK Ltd",
        address1: "10 Downing St",
        city: "London",
        provinceCode: "",
        countryCode: "GB",
        zip: ""
      }
    });
    input.cartValidation = {
      metafield: { value: JSON.stringify(customConfig) }
    };

    const result = run(input);
    expect(
      result.errors.some((e) => e.target === "$.cart.billingAddress.countryCode")
    ).toBe(true);
    expect(
      result.errors.some((e) => e.target === "$.cart.billingAddress.zip")
    ).toBe(true);
  });

  it("9. blocks under-MOQ wholesale orders (< $500.00 subtotal) on target $.cart", () => {
    const input = buildBaseB2BInput({
      cost: { subtotalAmount: { amount: "320.00" } }
    });
    const result = run(input);
    const moqErr = result.errors.find((e) => e.target === "$.cart");
    expect(moqErr).toBeDefined();
    expect(moqErr?.localizedMessage).toContain(
      "Wholesale minimum order subtotal is $500.00"
    );
  });

  it("10. blocks non-multiple line-item quantities for 6-pack and 12-pack wholesale items on $.cart", () => {
    const input = buildBaseB2BInput({
      lines: [
        {
          quantity: 7, // Not a multiple of 6
          merchandise: {
            __typename: "ProductVariant",
            id: "gid://shopify/ProductVariant/1001",
            sku: "CASE6-VALVE-200",
            product: {
              hasAnyTag: true,
              tags: ["Wholesale-Case-6"]
            }
          }
        },
        {
          quantity: 15, // Not a multiple of 12
          merchandise: {
            __typename: "ProductVariant",
            id: "gid://shopify/ProductVariant/1002",
            sku: "CASE12-GASKET",
            product: {
              hasAnyTag: true,
              tags: ["Wholesale-Case-12"]
            }
          }
        }
      ]
    });
    const result = run(input);
    const caseErrors = result.errors.filter((e) =>
      e.localizedMessage.includes("Wholesale case-pack rule")
    );
    expect(caseErrors).toHaveLength(2);
  });

  it("11. blocks incompatible Hazmat product combinations in the same order on $.cart", () => {
    const input = buildBaseB2BInput({
      lines: [
        {
          quantity: 6,
          merchandise: {
            __typename: "ProductVariant",
            id: "gid://shopify/ProductVariant/301",
            sku: "HAZ3-SOLVENT",
            product: {
              hasAnyTag: true,
              tags: ["Hazmat-Class-3"]
            }
          }
        },
        {
          quantity: 6,
          merchandise: {
            __typename: "ProductVariant",
            id: "gid://shopify/ProductVariant/302",
            sku: "OXID-PEROXIDE",
            product: {
              hasAnyTag: true,
              tags: ["Hazmat-Oxidizer"]
            }
          }
        }
      ]
    });
    const result = run(input);
    expect(
      result.errors.some(
        (e) =>
          e.target === "$.cart" &&
          e.localizedMessage.includes("Hazmat compliance restriction")
      )
    ).toBe(true);
  });

  it("12. strictly enforces < 20 KB output JSON budget even with 250 failing case-pack lines", () => {
    const manyLines = Array.from({ length: 250 }, (_, idx) => ({
      quantity: 5,
      merchandise: {
        __typename: "ProductVariant" as const,
        id: `gid://shopify/ProductVariant/${idx + 1}`,
        sku: `CASE6-BULK-SKU-${idx + 1}`,
        product: {
          hasAnyTag: true,
          tags: ["Wholesale-Case-6"]
        }
      }
    }));

    const input = buildBaseB2BInput({ lines: manyLines });
    const result = run(input);
    const serializedBytes = Buffer.byteLength(JSON.stringify(result), "utf8");
    expect(serializedBytes).toBeLessThan(MAX_OUTPUT_BYTES);
    expect(result.errors.length).toBeGreaterThan(10);
  });
});
