import type {
  PaymentFunctionRunResult,
  PaymentMethodInput,
  PaymentOperation,
  PaymentRunInput,
  TermsLockPaymentRulesConfig
} from "./types.js";

export const MAX_PAYMENT_OUTPUT_BYTES = 20_480;

export const DEFAULT_PAYMENT_RULES_CONFIG: TermsLockPaymentRulesConfig = {
  version: "2026-10",
  enabled: true,
  requirePoForNet30: true,
  poRegexPattern: "^PO-[0-9]{5,10}$",
  net30MethodKeywords: [
    "Net-30",
    "Net 30",
    "Invoice",
    "Manual Payment",
    "Purchase Order"
  ],
  authorizedNet30Tags: ["Net-30", "Approved-Wholesale"],
  promoteNet30WhenUnlocked: true,
  renamedNet30Label: "Net-30 Corporate Invoice (PO Verified)",
  hideCodForB2B: true,
  hideCodSubtotalThreshold: 1000.0,
  codMethodKeywords: ["Cash on Delivery", "COD"],
  hideHighFeeCardsAboveThreshold: true,
  highValueCardThreshold: 5000.0,
  highFeeCardKeywords: [
    "Credit Card",
    "Shopify Payments",
    "Bogus Gateway",
    "Amex"
  ]
};

export function parsePaymentRulesConfig(
  rawValue?: string | null
): TermsLockPaymentRulesConfig {
  if (!rawValue || rawValue.trim().length === 0) {
    return DEFAULT_PAYMENT_RULES_CONFIG;
  }
  try {
    const parsed = JSON.parse(rawValue) as Partial<TermsLockPaymentRulesConfig>;
    return {
      ...DEFAULT_PAYMENT_RULES_CONFIG,
      ...parsed,
      version: "2026-10"
    };
  } catch {
    return DEFAULT_PAYMENT_RULES_CONFIG;
  }
}

function safeRegexTest(pattern: string, value: string): boolean {
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return true;
  }
}

function matchesAnyKeyword(methodName: string, keywords: string[]): boolean {
  const normalized = methodName.toLowerCase();
  return keywords.some((kw) => normalized.includes(kw.toLowerCase()));
}

/**
 * Pure, deterministic Shopify Function entry point for B2B Payment Method Gate (`purchase.payment-customization.run`).
 * Zero network calls. Output strictly capped below 20 KB.
 */
export function run(input: PaymentRunInput): PaymentFunctionRunResult {
  const config = parsePaymentRulesConfig(
    input.paymentCustomization?.metafield?.value
  );

  if (!config.enabled) {
    return { operations: [] };
  }

  const operations: PaymentOperation[] = [];
  const hiddenIds = new Set<string>();

  const totalAmount = Number.parseFloat(
    input.cart.cost?.totalAmount?.amount ?? "0"
  );
  const safeTotal = Number.isFinite(totalAmount) ? totalAmount : 0;

  const rawPo = (input.cart.poNumber ?? "").trim();
  const hasValidPo =
    rawPo.length > 0 &&
    (!config.poRegexPattern || safeRegexTest(config.poRegexPattern, rawPo));

  const explicitTags = input.cart.buyerIdentity?.customer?.tags ?? [];
  const hasAuthorizedTag =
    explicitTags.length > 0
      ? explicitTags.some((t) => config.authorizedNet30Tags.includes(t))
      : Boolean(input.cart.buyerIdentity?.customer?.hasAnyTag);

  const hasWireOnlyTag = explicitTags.includes("Wire-Only");
  const hasPurchasingCompany = Boolean(
    input.cart.buyerIdentity?.purchasingCompany?.company?.id
  );
  const isB2BContext =
    hasPurchasingCompany ||
    hasAuthorizedTag ||
    explicitTags.includes("B2B") ||
    Boolean(input.cart.buyerIdentity?.customer?.hasAnyTag);

  // Buyer qualifies for Net-30 / Invoice ONLY if they have an authorized tag AND (valid PO when required)
  const net30Unlocked =
    hasAuthorizedTag && (!config.requirePoForNet30 || hasValidPo);

  for (const method of input.paymentMethods) {
    const isNet30Method = matchesAnyKeyword(
      method.name,
      config.net30MethodKeywords
    );
    const isCodMethod = matchesAnyKeyword(
      method.name,
      config.codMethodKeywords
    );
    const isHighFeeCardMethod = matchesAnyKeyword(
      method.name,
      config.highFeeCardKeywords
    );

    // Rule 1: Hide Net-30 / Invoice / Manual Payment unless authorized AND valid PO present
    if (isNet30Method) {
      if (!net30Unlocked) {
        hiddenIds.add(method.id);
        operations.push({
          hide: { paymentMethodId: method.id }
        });
      } else if (config.promoteNet30WhenUnlocked) {
        if (config.renamedNet30Label.trim().length > 0) {
          operations.push({
            rename: {
              paymentMethodId: method.id,
              name: config.renamedNet30Label
            }
          });
        }
        operations.push({
          move: {
            paymentMethodId: method.id,
            index: 0
          }
        });
      }
      continue;
    }

    // Rule 2: Hide Cash on Delivery (COD) when B2B terms apply or total exceeds COD threshold
    if (
      isCodMethod &&
      ((config.hideCodForB2B && isB2BContext) ||
        (config.hideCodSubtotalThreshold > 0 &&
          safeTotal >= config.hideCodSubtotalThreshold))
    ) {
      if (!hiddenIds.has(method.id)) {
        hiddenIds.add(method.id);
        operations.push({
          hide: { paymentMethodId: method.id }
        });
      }
      continue;
    }

    // Rule 3: Hide high-fee credit card gateways when cart total >= $5,000 or Wire-Only B2B terms apply
    if (
      isHighFeeCardMethod &&
      config.hideHighFeeCardsAboveThreshold &&
      (safeTotal >= config.highValueCardThreshold || hasWireOnlyTag)
    ) {
      if (!hiddenIds.has(method.id)) {
        hiddenIds.add(method.id);
        operations.push({
          hide: { paymentMethodId: method.id }
        });
      }
    }
  }

  return enforcePaymentOutputBudget(operations);
}

function enforcePaymentOutputBudget(
  operations: PaymentOperation[]
): PaymentFunctionRunResult {
  const bounded: PaymentOperation[] = [];
  for (const op of operations) {
    bounded.push(op);
    const serialized = JSON.stringify({ operations: bounded });
    if (
      Buffer.byteLength(serialized, "utf8") >=
      MAX_PAYMENT_OUTPUT_BYTES - 512
    ) {
      bounded.pop();
      break;
    }
  }
  return { operations: bounded };
}
