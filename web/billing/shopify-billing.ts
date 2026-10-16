import type { AdminGraphQLClient } from "../admin/graphql-mutations.ts";

export type BillingPlanTier = "B2B_STANDARD" | "PLUS_ENTERPRISE";

export interface BillingPlanSpec {
  tier: BillingPlanTier;
  name: string;
  amountUsd: number;
  currencyCode: "USD";
  interval: "EVERY_30_DAYS";
  trialDays: 14;
  features: {
    poValidation: boolean;
    billingAddressGate: boolean;
    wholesaleMoq: boolean;
    net30PaymentGate: boolean;
    hazmatCombinationGate: boolean;
    maxRuleProfiles: number;
  };
}

export const TERMSLOCK_BILLING_PLANS: Record<BillingPlanTier, BillingPlanSpec> =
  {
    B2B_STANDARD: {
      tier: "B2B_STANDARD",
      name: "B2B Standard Plan",
      amountUsd: 39.0,
      currencyCode: "USD",
      interval: "EVERY_30_DAYS",
      trialDays: 14,
      features: {
        poValidation: true,
        billingAddressGate: true,
        wholesaleMoq: true,
        net30PaymentGate: false,
        hazmatCombinationGate: false,
        maxRuleProfiles: 5
      }
    },
    PLUS_ENTERPRISE: {
      tier: "PLUS_ENTERPRISE",
      name: "Shopify Plus & Enterprise Wholesale Plan",
      amountUsd: 99.0,
      currencyCode: "USD",
      interval: "EVERY_30_DAYS",
      trialDays: 14,
      features: {
        poValidation: true,
        billingAddressGate: true,
        wholesaleMoq: true,
        net30PaymentGate: true,
        hazmatCombinationGate: true,
        maxRuleProfiles: 999
      }
    }
  };

export const APP_SUBSCRIPTION_CREATE_MUTATION = `#graphql
mutation AppSubscriptionCreate(
  $name: String!
  $returnUrl: URL!
  $trialDays: Int!
  $test: Boolean!
  $lineItems: [AppSubscriptionLineItemInput!]!
) {
  appSubscriptionCreate(
    name: $name
    returnUrl: $returnUrl
    trialDays: $trialDays
    test: $test
    lineItems: $lineItems
  ) {
    confirmationUrl
    appSubscription {
      id
      name
      status
      trialDays
    }
    userErrors {
      field
      message
    }
  }
}
`;

export interface SubscriptionCreationResult {
  tier: BillingPlanTier;
  planName: string;
  amountUsd: number;
  trialDays: number;
  confirmationUrl: string;
  subscriptionId: string;
  status: "PENDING" | "ACTIVE";
  bypassed: boolean;
}

export function isDevBillingBypassEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return (
    env.DEV_BYPASS_BILLING === "true" || env.DEV_BYPASS_BILLING === "1"
  );
}

/**
 * Builds exact `appSubscriptionCreate` variables for Shopify GraphQL Billing API (2026-10).
 */
export function buildAppSubscriptionVariables(params: {
  tier: BillingPlanTier;
  returnUrl: string;
  isTestCharge?: boolean;
}) {
  const plan = TERMSLOCK_BILLING_PLANS[params.tier];
  return {
    name: plan.name,
    returnUrl: params.returnUrl,
    trialDays: plan.trialDays,
    test: Boolean(params.isTestCharge),
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: {
              amount: plan.amountUsd,
              currencyCode: plan.currencyCode
            },
            interval: plan.interval
          }
        }
      }
    ]
  };
}

/**
 * Initiates a Shopify App Subscription or returns a synthetic active Enterprise subscription
 * when `DEV_BYPASS_BILLING=true` is enabled for development stores.
 */
export async function createOrBypassAppSubscription(
  client: AdminGraphQLClient,
  params: {
    tier: BillingPlanTier;
    returnUrl: string;
    isTestCharge?: boolean;
    env?: Record<string, string | undefined>;
  }
): Promise<SubscriptionCreationResult> {
  const plan = TERMSLOCK_BILLING_PLANS[params.tier];

  if (isDevBillingBypassEnabled(params.env)) {
    return {
      tier: params.tier,
      planName: plan.name,
      amountUsd: plan.amountUsd,
      trialDays: plan.trialDays,
      confirmationUrl: params.returnUrl,
      subscriptionId: "gid://shopify/AppSubscription/dev-bypass-2026-10",
      status: "ACTIVE",
      bypassed: true
    };
  }

  const variables = buildAppSubscriptionVariables(params);
  const response = await client.request<{
    appSubscriptionCreate: {
      confirmationUrl?: string | null;
      appSubscription?: {
        id: string;
        name: string;
        status: string;
        trialDays: number;
      } | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(APP_SUBSCRIPTION_CREATE_MUTATION, variables);

  const userErrors = response.data?.appSubscriptionCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(
      `appSubscriptionCreate failed: ${userErrors.map((e) => e.message).join("; ")}`
    );
  }

  const sub = response.data?.appSubscriptionCreate?.appSubscription;
  const confirmationUrl =
    response.data?.appSubscriptionCreate?.confirmationUrl ?? "";

  if (!sub || !confirmationUrl) {
    throw new Error(
      "Shopify Billing API did not return a confirmationUrl or appSubscription."
    );
  }

  return {
    tier: params.tier,
    planName: plan.name,
    amountUsd: plan.amountUsd,
    trialDays: plan.trialDays,
    confirmationUrl,
    subscriptionId: sub.id,
    status: "PENDING",
    bypassed: false
  };
}

/**
 * Verifies whether a merchant's active billing plan (or DEV_BYPASS_BILLING) allows a specific feature.
 */
export function checkPlanFeatureEntitlement(params: {
  activeTier: BillingPlanTier | null;
  feature: keyof BillingPlanSpec["features"];
  env?: Record<string, string | undefined>;
}): { allowed: boolean; requiredTier: BillingPlanTier; reason?: string } {
  if (isDevBillingBypassEnabled(params.env)) {
    return {
      allowed: true,
      requiredTier: "B2B_STANDARD"
    };
  }

  if (!params.activeTier) {
    return {
      allowed: false,
      requiredTier: "B2B_STANDARD",
      reason:
        "An active TermsLock subscription (14-day free trial available) is required."
    };
  }

  const plan = TERMSLOCK_BILLING_PLANS[params.activeTier];
  const value = plan.features[params.feature];
  const allowed = typeof value === "boolean" ? value : value > 0;

  if (!allowed) {
    return {
      allowed: false,
      requiredTier: "PLUS_ENTERPRISE",
      reason: `Feature '${params.feature}' requires the Shopify Plus & Enterprise Wholesale Plan ($99.00 / 30 days).`
    };
  }

  return {
    allowed: true,
    requiredTier: params.activeTier
  };
}
