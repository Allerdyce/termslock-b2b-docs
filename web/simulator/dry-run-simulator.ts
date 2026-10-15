import {
  DEFAULT_RULES_CONFIG,
  run as runValidation
} from "../../extensions/b2b-checkout-validator/src/run.js";
import type {
  FunctionError,
  RunInput,
  TermsLockRulesConfig
} from "../../extensions/b2b-checkout-validator/src/types.js";
import {
  DEFAULT_PAYMENT_RULES_CONFIG,
  run as runPaymentGate
} from "../../extensions/b2b-payment-gate/src/run.js";
import type {
  PaymentMethodInput,
  PaymentOperation,
  PaymentRunInput,
  TermsLockPaymentRulesConfig
} from "../../extensions/b2b-payment-gate/src/types.js";
import {
  compilePaymentRulesMetafield,
  compileValidationRulesMetafield
} from "../compiler/metafield-compiler.js";

export interface DryRunSimulatorLineItem {
  sku: string;
  quantity: number;
  productTags?: string[];
}

export interface DryRunSimulatorScenario {
  cartSubtotal: number;
  customerTags: string[];
  purchasingCompanyName?: string | null;
  poNumber?: string | null;
  billingCompany?: string | null;
  billingAddress1?: string | null;
  billingCountryCode?: string | null;
  billingProvinceCode?: string | null;
  billingZip?: string | null;
  lineItems?: DryRunSimulatorLineItem[];
  paymentMethods?: PaymentMethodInput[];
}

export interface SimulatedPaymentMethodStatus {
  id: string;
  originalName: string;
  displayName: string;
  visible: boolean;
  promotedToTop: boolean;
}

export interface DryRunSimulationReport {
  checkoutPassed: boolean;
  validationErrors: FunctionError[];
  paymentOperations: PaymentOperation[];
  paymentMethodsPreview: SimulatedPaymentMethodStatus[];
  telemetry: {
    validationMetafieldBytes: number;
    paymentMetafieldBytes: number;
    validationOutputBytes: number;
    paymentOutputBytes: number;
  };
}

export const DEFAULT_SIMULATOR_PAYMENT_METHODS: PaymentMethodInput[] = [
  { id: "gid://shopify/PaymentMethod/1", name: "Shopify Payments (Credit Card)" },
  { id: "gid://shopify/PaymentMethod/2", name: "Net-30 Invoice" },
  { id: "gid://shopify/PaymentMethod/3", name: "ACH / Wire Transfer" },
  { id: "gid://shopify/PaymentMethod/4", name: "Cash on Delivery (COD)" }
];

/**
 * Executes a real-time Dry-Run Checkout Simulation across both Shopify Functions
 * (`b2b-checkout-validator` and `b2b-payment-gate`) using the merchant's active rules.
 */
export function executeDryRunSimulation(
  scenario: DryRunSimulatorScenario,
  validationRules: TermsLockRulesConfig = DEFAULT_RULES_CONFIG,
  paymentRules: TermsLockPaymentRulesConfig = DEFAULT_PAYMENT_RULES_CONFIG
): DryRunSimulationReport {
  const compiledVal = compileValidationRulesMetafield(validationRules);
  const compiledPay = compilePaymentRulesMetafield(paymentRules);

  const b2bCustomerTags = [
    "B2B",
    "Net-30",
    "Wholesale",
    "Approved-Wholesale",
    "Tax-Exempt",
    "Wire-Only"
  ];
  const hasAnyB2BTag = scenario.customerTags.some((t) =>
    b2bCustomerTags.includes(t)
  );

  const lines = (
    scenario.lineItems ?? [
      { sku: "CASE6-WIDGET", quantity: 12, productTags: ["Wholesale-Case-6"] }
    ]
  ).map((item, idx) => ({
    quantity: item.quantity,
    merchandise: {
      __typename: "ProductVariant" as const,
      id: `gid://shopify/ProductVariant/${idx + 1}`,
      sku: item.sku,
      product: {
        hasAnyTag: (item.productTags ?? []).length > 0,
        tags: item.productTags ?? []
      }
    }
  }));

  const validationInput: RunInput = {
    cart: {
      poNumber: scenario.poNumber ?? null,
      billingAddress: {
        company: scenario.billingCompany ?? null,
        address1: scenario.billingAddress1 ?? "450 Commerce Pkwy",
        city: "Austin",
        provinceCode: scenario.billingProvinceCode ?? "TX",
        countryCode: scenario.billingCountryCode ?? "US",
        zip: scenario.billingZip ?? "78701"
      },
      cost: {
        subtotalAmount: {
          amount: scenario.cartSubtotal.toFixed(2)
        }
      },
      buyerIdentity: {
        customer: {
          hasAnyTag: hasAnyB2BTag,
          numberOfOrders: 5,
          tags: scenario.customerTags
        },
        purchasingCompany: scenario.purchasingCompanyName
          ? {
              company: {
                id: "gid://shopify/Company/101",
                name: scenario.purchasingCompanyName
              },
              location: {
                id: "gid://shopify/CompanyLocation/201"
              }
            }
          : null
      },
      lines
    },
    cartValidation: {
      metafield: {
        value: compiledVal.value
      }
    }
  };

  const availableMethods =
    scenario.paymentMethods ?? DEFAULT_SIMULATOR_PAYMENT_METHODS;

  const paymentInput: PaymentRunInput = {
    cart: {
      poNumber: scenario.poNumber ?? null,
      cost: {
        totalAmount: {
          amount: scenario.cartSubtotal.toFixed(2)
        }
      },
      buyerIdentity: {
        customer: {
          hasAnyTag: hasAnyB2BTag,
          tags: scenario.customerTags
        },
        purchasingCompany: scenario.purchasingCompanyName
          ? {
              company: {
                id: "gid://shopify/Company/101"
              }
            }
          : null
      }
    },
    paymentMethods: availableMethods,
    paymentCustomization: {
      metafield: {
        value: compiledPay.value
      }
    }
  };

  const validationResult = runValidation(validationInput);
  const paymentResult = runPaymentGate(paymentInput);

  const hiddenSet = new Set<string>();
  const renameMap = new Map<string, string>();
  const movedTopSet = new Set<string>();

  for (const op of paymentResult.operations) {
    if ("hide" in op) {
      hiddenSet.add(op.hide.paymentMethodId);
    } else if ("rename" in op) {
      renameMap.set(op.rename.paymentMethodId, op.rename.name);
    } else if ("move" in op && op.move.index === 0) {
      movedTopSet.add(op.move.paymentMethodId);
    }
  }

  const paymentMethodsPreview: SimulatedPaymentMethodStatus[] =
    availableMethods.map((m) => ({
      id: m.id,
      originalName: m.name,
      displayName: renameMap.get(m.id) ?? m.name,
      visible: !hiddenSet.has(m.id),
      promotedToTop: movedTopSet.has(m.id)
    }));

  const validationOutputBytes = Buffer.byteLength(
    JSON.stringify(validationResult),
    "utf8"
  );
  const paymentOutputBytes = Buffer.byteLength(
    JSON.stringify(paymentResult),
    "utf8"
  );

  return {
    checkoutPassed: validationResult.errors.length === 0,
    validationErrors: validationResult.errors,
    paymentOperations: paymentResult.operations,
    paymentMethodsPreview,
    telemetry: {
      validationMetafieldBytes: compiledVal.byteLength,
      paymentMetafieldBytes: compiledPay.byteLength,
      validationOutputBytes,
      paymentOutputBytes
    }
  };
}
