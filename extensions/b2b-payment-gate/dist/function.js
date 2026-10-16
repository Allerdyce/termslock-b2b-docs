// extensions/b2b-payment-gate/node_modules/@shopify/shopify_function/run.ts
function run_default(userfunction) {
  try {
    ShopifyFunction;
  } catch (e) {
    throw new Error(
      "ShopifyFunction is not defined. Please rebuild your function using the latest version of Shopify CLI."
    );
  }
  const input_obj = ShopifyFunction.readInput();
  const output_obj = userfunction(input_obj);
  ShopifyFunction.writeOutput(output_obj);
}

// extensions/b2b-payment-gate/src/run.ts
var MAX_PAYMENT_OUTPUT_BYTES = 20480;
var DEFAULT_PAYMENT_RULES_CONFIG = {
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
  hideCodSubtotalThreshold: 1e3,
  codMethodKeywords: ["Cash on Delivery", "COD"],
  hideHighFeeCardsAboveThreshold: true,
  highValueCardThreshold: 5e3,
  highFeeCardKeywords: [
    "Credit Card",
    "Shopify Payments",
    "Bogus Gateway",
    "Amex"
  ]
};
function parsePaymentRulesConfig(rawValue) {
  if (!rawValue || rawValue.trim().length === 0) {
    return DEFAULT_PAYMENT_RULES_CONFIG;
  }
  try {
    const parsed = JSON.parse(rawValue);
    return {
      ...DEFAULT_PAYMENT_RULES_CONFIG,
      ...parsed,
      version: "2026-10"
    };
  } catch {
    return DEFAULT_PAYMENT_RULES_CONFIG;
  }
}
function safeRegexTest(pattern, value) {
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return true;
  }
}
function matchesAnyKeyword(methodName, keywords) {
  const normalized = methodName.toLowerCase();
  return keywords.some((kw) => normalized.includes(kw.toLowerCase()));
}
function run(input) {
  const config = parsePaymentRulesConfig(
    input.paymentCustomization?.metafield?.value
  );
  if (!config.enabled) {
    return { operations: [] };
  }
  const operations = [];
  const hiddenIds = /* @__PURE__ */ new Set();
  const totalAmount = Number.parseFloat(
    input.cart.cost?.totalAmount?.amount ?? "0"
  );
  const safeTotal = Number.isFinite(totalAmount) ? totalAmount : 0;
  const rawPo = (input.cart.poNumber ?? "").trim();
  const hasValidPo = rawPo.length > 0 && (!config.poRegexPattern || safeRegexTest(config.poRegexPattern, rawPo));
  const explicitTags = input.cart.buyerIdentity?.customer?.tags ?? [];
  const hasAuthorizedTag = explicitTags.length > 0 ? explicitTags.some((t) => config.authorizedNet30Tags.includes(t)) : Boolean(input.cart.buyerIdentity?.customer?.hasAnyTag);
  const hasWireOnlyTag = explicitTags.includes("Wire-Only");
  const hasPurchasingCompany = Boolean(
    input.cart.buyerIdentity?.purchasingCompany?.company?.id
  );
  const isB2BContext = hasPurchasingCompany || hasAuthorizedTag || explicitTags.includes("B2B") || Boolean(input.cart.buyerIdentity?.customer?.hasAnyTag);
  const net30Unlocked = hasAuthorizedTag && (!config.requirePoForNet30 || hasValidPo);
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
    if (isCodMethod && (config.hideCodForB2B && isB2BContext || config.hideCodSubtotalThreshold > 0 && safeTotal >= config.hideCodSubtotalThreshold)) {
      if (!hiddenIds.has(method.id)) {
        hiddenIds.add(method.id);
        operations.push({
          hide: { paymentMethodId: method.id }
        });
      }
      continue;
    }
    if (isHighFeeCardMethod && config.hideHighFeeCardsAboveThreshold && (safeTotal >= config.highValueCardThreshold || hasWireOnlyTag)) {
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
function utf8ByteLength(str) {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 128) {
      bytes += 1;
    } else if (code < 2048) {
      bytes += 2;
    } else if (code >= 55296 && code <= 56319) {
      bytes += 4;
      i++;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}
function enforcePaymentOutputBudget(operations) {
  const bounded = [];
  for (const op of operations) {
    bounded.push(op);
    const serialized = JSON.stringify({ operations: bounded });
    if (utf8ByteLength(serialized) >= MAX_PAYMENT_OUTPUT_BYTES - 512) {
      bounded.pop();
      break;
    }
  }
  return { operations: bounded };
}

// <stdin>
function run2() {
  return run_default(run);
}
export {
  run2 as run
};
