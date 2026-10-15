import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_RULES_CONFIG } from "../extensions/b2b-checkout-validator/src/index.js";
import { DEFAULT_PAYMENT_RULES_CONFIG } from "../extensions/b2b-payment-gate/src/index.js";
import {
  registerTermsLockFunctions,
  syncRulesToShopifyAdmin,
  type AdminGraphQLClient
} from "../web/admin/graphql-mutations.js";
import {
  checkPlanFeatureEntitlement,
  createOrBypassAppSubscription,
  TERMSLOCK_BILLING_PLANS
} from "../web/billing/shopify-billing.js";
import {
  APP_METAFIELD_NAMESPACE,
  compileValidationRulesMetafield,
  estimateGraphQLQueryComplexity,
  InvalidRuleRegexError,
  MAX_METAFIELD_BYTES,
  MetafieldBudgetExceededError
} from "../web/compiler/metafield-compiler.js";
import { handleGdprWebhook } from "../web/webhooks/gdpr-handlers.js";

describe("Milestone 3: Metafield Compiler (<10 KB), GraphQL Complexity (<30 pts), Admin Sync & Billing API", () => {
  it("20. compiles validation rules to $app:termslock.rules_config well under the <10 KB budget", () => {
    const compiled = compileValidationRulesMetafield(DEFAULT_RULES_CONFIG);
    expect(compiled.namespace).toBe(APP_METAFIELD_NAMESPACE);
    expect(compiled.key).toBe("rules_config");
    expect(compiled.byteLength).toBeLessThan(MAX_METAFIELD_BYTES);
    expect(compiled.budgetUtilizationPercent).toBeLessThan(25);
  });

  it("21. throws MetafieldBudgetExceededError when rule configuration reaches or exceeds 10,240 bytes", () => {
    const bloatedConfig = {
      ...DEFAULT_RULES_CONFIG,
      poRule: {
        ...DEFAULT_RULES_CONFIG.poRule,
        errorMessageMissing: "X".repeat(10_500)
      }
    };
    expect(() => compileValidationRulesMetafield(bloatedConfig)).toThrowError(
      MetafieldBudgetExceededError
    );
  });

  it("22. rejects invalid regular expressions at compile time with InvalidRuleRegexError", () => {
    const brokenRegexConfig = {
      ...DEFAULT_RULES_CONFIG,
      poRule: {
        ...DEFAULT_RULES_CONFIG.poRule,
        regexPattern: "[unclosed-group"
      }
    };
    expect(() => compileValidationRulesMetafield(brokenRegexConfig)).toThrowError(
      InvalidRuleRegexError
    );
  });

  it("23. verifies both Function run.graphql queries stay strictly under <30 complexity points", () => {
    const validatorQuery = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "extensions/b2b-checkout-validator/run.graphql"
      ),
      "utf8"
    );
    const paymentQuery = fs.readFileSync(
      path.resolve(process.cwd(), "extensions/b2b-payment-gate/run.graphql"),
      "utf8"
    );

    const valComplexity = estimateGraphQLQueryComplexity(validatorQuery);
    const payComplexity = estimateGraphQLQueryComplexity(paymentQuery);

    expect(valComplexity.withinLimit).toBe(true);
    expect(valComplexity.complexityPoints).toBeLessThan(30);
    expect(payComplexity.withinLimit).toBe(true);
    expect(payComplexity.complexityPoints).toBeLessThan(30);
  });

  it("24. executes cartValidationCreate, paymentCustomizationCreate, and metafieldsSet Admin GraphQL mutations", async () => {
    const calls: { query: string; variables: Record<string, unknown> }[] = [];
    const mockClient: AdminGraphQLClient = {
      async request<TData>(query: string, variables: Record<string, unknown>) {
        calls.push({ query, variables });
        if (query.includes("cartValidationCreate")) {
          return {
            data: {
              cartValidationCreate: {
                cartValidation: {
                  id: "gid://shopify/CartValidation/10",
                  title: "TermsLock Validator",
                  enabled: true
                },
                userErrors: []
              }
            } as unknown as TData
          };
        }
        if (query.includes("paymentCustomizationCreate")) {
          return {
            data: {
              paymentCustomizationCreate: {
                paymentCustomization: {
                  id: "gid://shopify/PaymentCustomization/20",
                  title: "TermsLock Payment Gate",
                  enabled: true
                },
                userErrors: []
              }
            } as unknown as TData
          };
        }
        return {
          data: {
            metafieldsSet: {
              metafields: [
                {
                  id: "gid://shopify/Metafield/1",
                  namespace: "$app:termslock",
                  key: "rules_config"
                },
                {
                  id: "gid://shopify/Metafield/2",
                  namespace: "$app:termslock",
                  key: "payment_rules"
                }
              ],
              userErrors: []
            }
          } as unknown as TData
        };
      }
    };

    const registered = await registerTermsLockFunctions(mockClient, {
      validationFunctionId: "8f2a9c40-7d1e-4b3a-9c12-100000000001",
      paymentFunctionId: "8f2a9c40-7d1e-4b3a-9c12-100000000002",
      validationRules: DEFAULT_RULES_CONFIG,
      paymentRules: DEFAULT_PAYMENT_RULES_CONFIG
    });

    expect(registered.cartValidationId).toBe(
      "gid://shopify/CartValidation/10"
    );
    expect(registered.paymentCustomizationId).toBe(
      "gid://shopify/PaymentCustomization/20"
    );

    const synced = await syncRulesToShopifyAdmin(mockClient, {
      cartValidationOwnerId: registered.cartValidationId,
      paymentCustomizationOwnerId: registered.paymentCustomizationId,
      validationRules: DEFAULT_RULES_CONFIG,
      paymentRules: DEFAULT_PAYMENT_RULES_CONFIG
    });

    expect(synced.updatedCount).toBe(2);
    expect(calls).toHaveLength(3);
  });

  it("25. creates Shopify Billing subscriptions for B2B Standard ($39/30d) and Plus Enterprise ($99/30d) with 14-day free trial", async () => {
    const mockClient: AdminGraphQLClient = {
      async request<TData>(_query: string, variables: Record<string, unknown>) {
        return {
          data: {
            appSubscriptionCreate: {
              confirmationUrl:
                "https://termslock-b2b-dev.myshopify.com/admin/charges/confirm",
              appSubscription: {
                id: "gid://shopify/AppSubscription/9001",
                name: String(variables.name),
                status: "PENDING",
                trialDays: Number(variables.trialDays)
              },
              userErrors: []
            }
          } as unknown as TData
        };
      }
    };

    const standardSub = await createOrBypassAppSubscription(mockClient, {
      tier: "B2B_STANDARD",
      returnUrl: "https://termslock.evidencepair.com/billing/callback",
      env: { DEV_BYPASS_BILLING: "false" }
    });
    expect(standardSub.amountUsd).toBe(39.0);
    expect(standardSub.trialDays).toBe(14);
    expect(standardSub.bypassed).toBe(false);

    const plusSub = await createOrBypassAppSubscription(mockClient, {
      tier: "PLUS_ENTERPRISE",
      returnUrl: "https://termslock.evidencepair.com/billing/callback",
      env: { DEV_BYPASS_BILLING: "false" }
    });
    expect(plusSub.amountUsd).toBe(99.0);
    expect(plusSub.trialDays).toBe(14);
    expect(TERMSLOCK_BILLING_PLANS.PLUS_ENTERPRISE.interval).toBe(
      "EVERY_30_DAYS"
    );
  });

  it("26. supports DEV_BYPASS_BILLING=true flag and enforces plan feature entitlements", async () => {
    const noopClient: AdminGraphQLClient = {
      async request() {
        throw new Error("Should not call network when DEV_BYPASS_BILLING=true");
      }
    };

    const bypassed = await createOrBypassAppSubscription(noopClient, {
      tier: "PLUS_ENTERPRISE",
      returnUrl: "https://termslock.evidencepair.com/billing/callback",
      env: { DEV_BYPASS_BILLING: "true" }
    });
    expect(bypassed.bypassed).toBe(true);
    expect(bypassed.status).toBe("ACTIVE");

    const standardGateOnNet30 = checkPlanFeatureEntitlement({
      activeTier: "B2B_STANDARD",
      feature: "net30PaymentGate",
      env: { DEV_BYPASS_BILLING: "false" }
    });
    expect(standardGateOnNet30.allowed).toBe(false);
    expect(standardGateOnNet30.requiredTier).toBe("PLUS_ENTERPRISE");

    const plusGateOnNet30 = checkPlanFeatureEntitlement({
      activeTier: "PLUS_ENTERPRISE",
      feature: "net30PaymentGate",
      env: { DEV_BYPASS_BILLING: "false" }
    });
    expect(plusGateOnNet30.allowed).toBe(true);
  });

  it("27. verifies mandatory GDPR compliance webhooks (customers/data_request, customers/redact, shop/redact) with HMAC-SHA256", () => {
    const secret = "shpss_test_secret_2026_10";
    const body = JSON.stringify({
      shop_id: 99123,
      shop_domain: "b2b-merchant.myshopify.com",
      customer: { id: 4412, email: "buyer@apex.com" }
    });
    const validHmac = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");

    const okResp = handleGdprWebhook({
      topic: "customers/data_request",
      rawBody: body,
      hmacHeader: validHmac,
      clientSecret: secret
    });
    expect(okResp.statusCode).toBe(200);
    expect(okResp.piiStoredCount).toBe(0);

    const badResp = handleGdprWebhook({
      topic: "shop/redact",
      rawBody: body,
      hmacHeader: "invalid_hmac_signature",
      clientSecret: secret
    });
    expect(badResp.statusCode).toBe(401);
  });
});
