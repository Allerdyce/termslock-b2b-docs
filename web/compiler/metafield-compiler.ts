import type { TermsLockRulesConfig } from "../../extensions/b2b-checkout-validator/src/types.ts";
import type { TermsLockPaymentRulesConfig } from "../../extensions/b2b-payment-gate/src/types.ts";

export const APP_METAFIELD_NAMESPACE = "$app:termslock";
export const VALIDATION_METAFIELD_KEY = "rules_config";
export const PAYMENT_METAFIELD_KEY = "payment_rules";
export const MAX_METAFIELD_BYTES = 10_240; // < 10 KB strict limit
export const MAX_QUERY_COMPLEXITY_POINTS = 30; // < 30 points strict limit

export class MetafieldBudgetExceededError extends Error {
  public readonly byteLength: number;
  public readonly maxBytes: number;
  public readonly key: string;

  constructor(key: string, byteLength: number, maxBytes = MAX_METAFIELD_BYTES) {
    super(
      `Metafield '${APP_METAFIELD_NAMESPACE}.${key}' payload size (${byteLength} bytes) exceeds the strict <10 KB (${maxBytes} bytes) limit.`
    );
    this.name = "MetafieldBudgetExceededError";
    this.key = key;
    this.byteLength = byteLength;
    this.maxBytes = maxBytes;
  }
}

export class InvalidRuleRegexError extends Error {
  public readonly field: string;
  public readonly pattern: string;

  constructor(field: string, pattern: string) {
    super(`Invalid regular expression in rule field '${field}': ${pattern}`);
    this.name = "InvalidRuleRegexError";
    this.field = field;
    this.pattern = pattern;
  }
}

export interface CompiledMetafieldPayload {
  namespace: typeof APP_METAFIELD_NAMESPACE;
  key: string;
  type: "json";
  value: string;
  byteLength: number;
  budgetUtilizationPercent: number;
}

function assertValidRegex(field: string, pattern: string): void {
  if (!pattern) return;
  try {
    new RegExp(pattern);
  } catch {
    throw new InvalidRuleRegexError(field, pattern);
  }
}

/**
 * Compiles merchant B2B validation rules into a minified <10 KB JSON metafield payload.
 */
export function compileValidationRulesMetafield(
  config: TermsLockRulesConfig
): CompiledMetafieldPayload {
  assertValidRegex("poRule.regexPattern", config.poRule.regexPattern);
  assertValidRegex(
    "billingRule.taxIdRegexPattern",
    config.billingRule.taxIdRegexPattern
  );

  const normalized: TermsLockRulesConfig = {
    ...config,
    version: "2026-10"
  };

  const value = JSON.stringify(normalized);
  const byteLength = Buffer.byteLength(value, "utf8");

  if (byteLength >= MAX_METAFIELD_BYTES) {
    throw new MetafieldBudgetExceededError(
      VALIDATION_METAFIELD_KEY,
      byteLength,
      MAX_METAFIELD_BYTES
    );
  }

  return {
    namespace: APP_METAFIELD_NAMESPACE,
    key: VALIDATION_METAFIELD_KEY,
    type: "json",
    value,
    byteLength,
    budgetUtilizationPercent: Number(
      ((byteLength / MAX_METAFIELD_BYTES) * 100).toFixed(2)
    )
  };
}

/**
 * Compiles merchant Net-30 & Wholesale payment customization rules into a minified <10 KB JSON metafield payload.
 */
export function compilePaymentRulesMetafield(
  config: TermsLockPaymentRulesConfig
): CompiledMetafieldPayload {
  assertValidRegex("poRegexPattern", config.poRegexPattern);

  const normalized: TermsLockPaymentRulesConfig = {
    ...config,
    version: "2026-10"
  };

  const value = JSON.stringify(normalized);
  const byteLength = Buffer.byteLength(value, "utf8");

  if (byteLength >= MAX_METAFIELD_BYTES) {
    throw new MetafieldBudgetExceededError(
      PAYMENT_METAFIELD_KEY,
      byteLength,
      MAX_METAFIELD_BYTES
    );
  }

  return {
    namespace: APP_METAFIELD_NAMESPACE,
    key: PAYMENT_METAFIELD_KEY,
    type: "json",
    value,
    byteLength,
    budgetUtilizationPercent: Number(
      ((byteLength / MAX_METAFIELD_BYTES) * 100).toFixed(2)
    )
  };
}

/**
 * Deterministic Shopify Functions GraphQL input query complexity estimator.
 * Verifies that `run.graphql` remains strictly under the 30-point ceiling.
 */
export function estimateGraphQLQueryComplexity(queryText: string): {
  complexityPoints: number;
  withinLimit: boolean;
  maxPoints: number;
} {
  const cleaned = queryText
    .replace(/#.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  let points = 0;

  // List fields & connections cost 3 points in Shopify Functions complexity scoring
  const listFields = ["lines", "paymentMethods", "deliveryGroups"];
  for (const lf of listFields) {
    const regex = new RegExp(`\\b${lf}\\b`, "g");
    const matches = cleaned.match(regex);
    if (matches) {
      points += matches.length * 3;
    }
  }

  // Computed predicate fields like hasAnyTag or metafield lookups cost 2 points
  const computedFields = ["hasAnyTag", "metafield", "purchasingCompany", "billingAddress"];
  for (const cf of computedFields) {
    const regex = new RegExp(`\\b${cf}\\b`, "g");
    const matches = cleaned.match(regex);
    if (matches) {
      points += matches.length * 2;
    }
  }

  // Object/scalar selections cost 1 point for primary root/nested composite objects
  const objectNodes = ["cart", "cost", "buyerIdentity", "customer", "merchandise", "product"];
  for (const obj of objectNodes) {
    const regex = new RegExp(`\\b${obj}\\b`, "g");
    const matches = cleaned.match(regex);
    if (matches) {
      points += matches.length;
    }
  }

  return {
    complexityPoints: points,
    withinLimit: points < MAX_QUERY_COMPLEXITY_POINTS,
    maxPoints: MAX_QUERY_COMPLEXITY_POINTS
  };
}
