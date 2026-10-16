import type {
  CartLineInput,
  FunctionError,
  FunctionRunResult,
  ProductVariantMerchandise,
  RunInput,
  TermsLockRulesConfig
} from "./types.ts";

export const MAX_OUTPUT_BYTES = 20_480; // < 20 KB Shopify Function output ceiling

export const DEFAULT_RULES_CONFIG: TermsLockRulesConfig = {
  version: "2026-10",
  poRule: {
    enabled: true,
    requireForPurchasingCompany: true,
    requireForCustomerTags: true,
    subtotalThreshold: 1000.0,
    minLength: 4,
    regexPattern: "^PO-[0-9]{5,10}$",
    errorMessageMissing:
      "A valid Purchase Order (PO) number is required for B2B, Net-30, or orders of $1,000.00+.",
    errorMessageFormat:
      "Invalid PO number format. Must match corporate standard (e.g., PO-10492)."
  },
  billingRule: {
    enabled: true,
    blockPoBoxOnFreight: true,
    freightSkuPrefixes: ["FREIGHT-", "PLT-", "PALLET-"],
    freightTags: ["Freight", "Pallet"],
    requireCompanyForB2B: true,
    requireTaxIdPrefixInCompany: false,
    taxIdRegexPattern: "(VAT|TAX|EIN|GST)-[A-Z0-9]{5,15}",
    allowedCountries: [],
    requireProvinceCodeForCountries: ["US", "CA"],
    requireZip: true
  },
  moqRule: {
    enabled: true,
    minimumSubtotal: 500.0,
    skuCaseMultipliers: {
      "CASE6-": 6,
      "CASE12-": 12
    },
    tagCaseMultipliers: {
      "Wholesale-Case-6": 6,
      "Wholesale-Case-12": 12
    }
  },
  hazmatRule: {
    enabled: true,
    incompatibleTagPairs: [
      ["Hazmat-Class-3", "Hazmat-Oxidizer"],
      ["Hazmat-Class-3", "Lithium-Bulk"]
    ],
    incompatibleSkuPrefixPairs: [
      ["HAZ3-", "OXID-"],
      ["HAZ3-", "LITH-"]
    ]
  }
};

const PO_BOX_REGEX =
  /\b(?:p\.?\s*o\.?\s*box|post\s+office\s+box|postal\s+box|pob\s+#?\d+)\b/i;

function isProductVariant(
  merchandise: CartLineInput["merchandise"]
): merchandise is ProductVariantMerchandise {
  return (
    merchandise.__typename !== "CustomProduct" &&
    "product" in merchandise
  );
}

export function parseRulesConfig(rawValue?: string | null): TermsLockRulesConfig {
  if (!rawValue || rawValue.trim().length === 0) {
    return DEFAULT_RULES_CONFIG;
  }
  try {
    const parsed = JSON.parse(rawValue) as Partial<TermsLockRulesConfig>;
    return {
      version: "2026-10",
      poRule: { ...DEFAULT_RULES_CONFIG.poRule, ...(parsed.poRule ?? {}) },
      billingRule: {
        ...DEFAULT_RULES_CONFIG.billingRule,
        ...(parsed.billingRule ?? {})
      },
      moqRule: { ...DEFAULT_RULES_CONFIG.moqRule, ...(parsed.moqRule ?? {}) },
      hazmatRule: {
        ...DEFAULT_RULES_CONFIG.hazmatRule,
        ...(parsed.hazmatRule ?? {})
      }
    };
  } catch {
    return DEFAULT_RULES_CONFIG;
  }
}

function safeRegexTest(pattern: string, value: string): boolean {
  try {
    const regex = new RegExp(pattern);
    return regex.test(value);
  } catch {
    return true;
  }
}

function isB2BCustomerOrCompany(input: RunInput): boolean {
  const hasPurchasingCompany = Boolean(
    input.cart.buyerIdentity?.purchasingCompany?.company?.id
  );
  const hasB2BTag = Boolean(input.cart.buyerIdentity?.customer?.hasAnyTag);
  return hasPurchasingCompany || hasB2BTag;
}

/**
 * Pure, deterministic Shopify Function entry point for B2B Checkout Validation (`purchase.validation.run`).
 * Zero network calls. Output strictly capped below 20 KB.
 */
export function run(input: RunInput): FunctionRunResult {
  const config = parseRulesConfig(
    input.validation?.metafield?.value ?? input.cartValidation?.metafield?.value
  );
  const errors: FunctionError[] = [];

  const subtotal = Number.parseFloat(
    input.cart.cost?.subtotalAmount?.amount ?? "0"
  );
  const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;

  const hasCompany = Boolean(
    input.cart.buyerIdentity?.purchasingCompany?.company?.id
  );
  const hasCustomerB2BTag = Boolean(
    input.cart.buyerIdentity?.customer?.hasAnyTag
  );
  const isB2BOrder = isB2BCustomerOrCompany(input);

  // =========================================================================
  // GATE 1: PO Number Format & Requirement Gate ($.cart.poNumber)
  // =========================================================================
  if (config.poRule.enabled) {
    const requiresPo =
      (config.poRule.requireForPurchasingCompany && hasCompany) ||
      (config.poRule.requireForCustomerTags && hasCustomerB2BTag) ||
      (config.poRule.subtotalThreshold > 0 &&
        safeSubtotal >= config.poRule.subtotalThreshold);

    const rawPo = (input.cart.poNumber ?? "").trim();

    if (requiresPo) {
      if (rawPo.length === 0 || rawPo.length < config.poRule.minLength) {
        errors.push({
          localizedMessage: config.poRule.errorMessageMissing,
          target: "$.cart.poNumber"
        });
      } else if (
        config.poRule.regexPattern &&
        !safeRegexTest(config.poRule.regexPattern, rawPo)
      ) {
        errors.push({
          localizedMessage: config.poRule.errorMessageFormat,
          target: "$.cart.poNumber"
        });
      }
    } else if (
      rawPo.length > 0 &&
      config.poRule.regexPattern &&
      !safeRegexTest(config.poRule.regexPattern, rawPo)
    ) {
      // Even when optional, if buyer entered a malformed PO number, validate format
      errors.push({
        localizedMessage: config.poRule.errorMessageFormat,
        target: "$.cart.poNumber"
      });
    }
  }

  // =========================================================================
  // GATE 2: B2B Billing Address & Tax/Company Gate ($.cart.billingAddress.*)
  // =========================================================================
  if (config.billingRule.enabled) {
    const billing = input.cart.billingAddress;

    // 2a. Block PO Box addresses when cart contains Freight/Pallet items
    if (config.billingRule.blockPoBoxOnFreight) {
      const hasFreightItem = input.cart.lines.some((line) => {
        if (!isProductVariant(line.merchandise)) {
          return false;
        }
        const sku = (line.merchandise.sku ?? "").toUpperCase();
        const skuMatchesFreight = config.billingRule.freightSkuPrefixes.some(
          (prefix) => sku.startsWith(prefix.toUpperCase())
        );
        const explicitTags = line.merchandise.product.tags ?? [];
        const tagMatchesFreight =
          explicitTags.length > 0
            ? explicitTags.some((t) =>
                config.billingRule.freightTags.includes(t)
              )
            : Boolean(line.merchandise.product.hasAnyTag) &&
              (skuMatchesFreight || explicitTags.length === 0);

        return skuMatchesFreight || tagMatchesFreight;
      });

      const address1 = (billing?.address1 ?? "").trim();
      if (hasFreightItem && PO_BOX_REGEX.test(address1)) {
        errors.push({
          localizedMessage:
            "PO Box billing/delivery addresses cannot be used for palletized or LTL freight items. Please provide a physical commercial street address.",
          target: "$.cart.billingAddress.address1"
        });
      }
    }

    // 2b. Require Billing Company & optional VAT/Tax ID prefix for B2B/Wholesale orders
    if (isB2BOrder && config.billingRule.requireCompanyForB2B) {
      const companyName = (billing?.company ?? "").trim();
      if (companyName.length === 0) {
        errors.push({
          localizedMessage:
            "A registered Company Legal Name is required on the billing address for B2B and wholesale orders.",
          target: "$.cart.billingAddress.company"
        });
      } else if (
        config.billingRule.requireTaxIdPrefixInCompany &&
        config.billingRule.taxIdRegexPattern &&
        !safeRegexTest(config.billingRule.taxIdRegexPattern, companyName)
      ) {
        errors.push({
          localizedMessage:
            "Wholesale billing company must include a valid Tax/VAT ID (e.g., 'Acme Corp (VAT-994821)').",
          target: "$.cart.billingAddress.company"
        });
      }
    }

    // 2c. Billing Country, Province, and ZIP completeness on B2B orders when billingAddress is provided
    if (isB2BOrder && billing) {
      const countryCode = (billing.countryCode ?? "").trim().toUpperCase();
      if (
        config.billingRule.allowedCountries.length > 0 &&
        countryCode.length > 0 &&
        !config.billingRule.allowedCountries
          .map((c) => c.toUpperCase())
          .includes(countryCode)
      ) {
        errors.push({
          localizedMessage: `B2B invoicing is not available for billing country '${countryCode}'.`,
          target: "$.cart.billingAddress.countryCode"
        });
      }

      if (
        countryCode.length > 0 &&
        config.billingRule.requireProvinceCodeForCountries
          .map((c) => c.toUpperCase())
          .includes(countryCode) &&
        (billing.provinceCode ?? "").trim().length === 0
      ) {
        errors.push({
          localizedMessage: `A state or province code is required for B2B billing addresses in ${countryCode}.`,
          target: "$.cart.billingAddress.provinceCode"
        });
      }

      if (
        config.billingRule.requireZip &&
        countryCode.length > 0 &&
        (billing.zip ?? "").trim().length === 0
      ) {
        errors.push({
          localizedMessage:
            "A valid postal or ZIP code is required on the B2B billing address.",
          target: "$.cart.billingAddress.zip"
        });
      }
    }
  }

  // =========================================================================
  // GATE 3: Wholesale MOQ & Case-Pack Multiplier Gate ($.cart)
  // =========================================================================
  if (config.moqRule.enabled && isB2BOrder) {
    if (
      config.moqRule.minimumSubtotal > 0 &&
      safeSubtotal < config.moqRule.minimumSubtotal
    ) {
      errors.push({
        localizedMessage: `Wholesale minimum order subtotal is $${config.moqRule.minimumSubtotal.toFixed(
          2
        )} (current subtotal: $${safeSubtotal.toFixed(2)}).`,
        target: "$.cart"
      });
    }

    for (const line of input.cart.lines) {
      if (!isProductVariant(line.merchandise)) {
        continue;
      }
      const sku = (line.merchandise.sku ?? "").trim();
      const explicitTags = line.merchandise.product.tags ?? [];

      let requiredMultiple: number | undefined =
        config.moqRule.defaultCasePackMultiple;

      for (const [prefix, multiple] of Object.entries(
        config.moqRule.skuCaseMultipliers
      )) {
        if (sku.toUpperCase().startsWith(prefix.toUpperCase())) {
          requiredMultiple = multiple;
          break;
        }
      }

      if (!requiredMultiple && explicitTags.length > 0) {
        for (const [tag, multiple] of Object.entries(
          config.moqRule.tagCaseMultipliers
        )) {
          if (explicitTags.includes(tag)) {
            requiredMultiple = multiple;
            break;
          }
        }
      }

      if (
        requiredMultiple &&
        requiredMultiple > 1 &&
        line.quantity % requiredMultiple !== 0
      ) {
        const label = sku || line.merchandise.id;
        errors.push({
          localizedMessage: `Wholesale case-pack rule: Item '${label}' must be ordered in multiples of ${requiredMultiple} units (received quantity: ${line.quantity}).`,
          target: "$.cart"
        });
      }
    }
  }

  // =========================================================================
  // GATE 4: Hazmat / Restricted SKU Combination Gate ($.cart)
  // =========================================================================
  if (config.hazmatRule.enabled && input.cart.lines.length > 1) {
    const presentTags = new Set<string>();
    const presentSkus: string[] = [];

    for (const line of input.cart.lines) {
      if (!isProductVariant(line.merchandise)) {
        continue;
      }
      if (line.merchandise.sku) {
        presentSkus.push(line.merchandise.sku.toUpperCase());
      }
      for (const tag of line.merchandise.product.tags ?? []) {
        presentTags.add(tag);
      }
    }

    for (const [tagA, tagB] of config.hazmatRule.incompatibleTagPairs) {
      if (presentTags.has(tagA) && presentTags.has(tagB)) {
        errors.push({
          localizedMessage: `Hazmat compliance restriction: Products tagged '${tagA}' and '${tagB}' cannot be shipped together in the same checkout order.`,
          target: "$.cart"
        });
      }
    }

    for (const [prefixA, prefixB] of config.hazmatRule
      .incompatibleSkuPrefixPairs) {
      const hasA = presentSkus.some((s) =>
        s.startsWith(prefixA.toUpperCase())
      );
      const hasB = presentSkus.some((s) =>
        s.startsWith(prefixB.toUpperCase())
      );
      if (hasA && hasB) {
        errors.push({
          localizedMessage: `Hazmat SKU restriction: Items with prefix '${prefixA}' and '${prefixB}' cannot be combined in the same order.`,
          target: "$.cart"
        });
      }
    }
  }

  return enforceOutputBudget(errors);
}

function utf8ByteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

function enforceOutputBudget(errors: FunctionError[]): FunctionRunResult {
  const boundedErrors: FunctionError[] = [];
  for (const err of errors) {
    const sanitized: FunctionError = {
      localizedMessage:
        err.localizedMessage.length > 400
          ? `${err.localizedMessage.slice(0, 397)}...`
          : err.localizedMessage,
      target: err.target
    };
    boundedErrors.push(sanitized);
    const serialized = JSON.stringify({ errors: boundedErrors });
    if (utf8ByteLength(serialized) >= MAX_OUTPUT_BYTES - 512) {
      boundedErrors.pop();
      break;
    }
  }
  return { errors: boundedErrors };
}

export default run;


