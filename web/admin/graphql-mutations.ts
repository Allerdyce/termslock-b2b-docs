import type { TermsLockRulesConfig } from "../../extensions/b2b-checkout-validator/src/types.ts";
import type { TermsLockPaymentRulesConfig } from "../../extensions/b2b-payment-gate/src/types.ts";
import {
  APP_METAFIELD_NAMESPACE,
  compilePaymentRulesMetafield,
  compileValidationRulesMetafield,
  PAYMENT_METAFIELD_KEY,
  VALIDATION_METAFIELD_KEY
} from "../compiler/metafield-compiler.ts";

export const SHOPIFY_ADMIN_API_VERSION = "2026-10";
export const CHECKOUT_VALIDATOR_FUNCTION_HANDLE = "termslock-checkout-validator";
export const PAYMENT_GATE_FUNCTION_HANDLE = "termslock-payment-gate";

export const CART_VALIDATION_CREATE_MUTATION = `#graphql
mutation CartValidationCreate(
  $functionId: String
  $functionHandle: String
  $title: String!
  $blockOnFailure: Boolean!
  $metafields: [MetafieldInput!]
) {
  cartValidationCreate(
    cartValidation: {
      functionId: $functionId
      functionHandle: $functionHandle
      title: $title
      blockOnFailure: $blockOnFailure
      enable: true
      metafields: $metafields
    }
  ) {
    cartValidation {
      id
      title
      enabled
    }
    userErrors {
      field
      message
      code
    }
  }
}
`;

export const PAYMENT_CUSTOMIZATION_CREATE_MUTATION = `#graphql
mutation PaymentCustomizationCreate(
  $functionId: String
  $functionHandle: String
  $title: String!
  $enabled: Boolean!
  $metafields: [MetafieldInput!]
) {
  paymentCustomizationCreate(
    paymentCustomization: {
      functionId: $functionId
      functionHandle: $functionHandle
      title: $title
      enabled: $enabled
      metafields: $metafields
    }
  ) {
    paymentCustomization {
      id
      title
      enabled
    }
    userErrors {
      field
      message
      code
    }
  }
}
`;

export const METAFIELDS_SET_MUTATION = `#graphql
mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
      value
    }
    userErrors {
      field
      message
      code
    }
  }
}
`;

export interface AdminGraphQLClient {
  request<TData = unknown>(
    query: string,
    variables: Record<string, unknown>
  ): Promise<{ data?: TData; errors?: { message: string }[] }>;
}

export interface MetafieldSetVariable {
  ownerId: string;
  namespace: typeof APP_METAFIELD_NAMESPACE;
  key: string;
  type: "json";
  value: string;
}

/**
 * Builds the `metafieldsSet` GraphQL mutation variables for syncing both B2B validation rules
 * and Net-30 payment customization rules into `$app:termslock`.
 */
export function buildMetafieldsSetVariables(params: {
  cartValidationOwnerId: string;
  paymentCustomizationOwnerId: string;
  validationRules: TermsLockRulesConfig;
  paymentRules: TermsLockPaymentRulesConfig;
}): {
  metafields: MetafieldSetVariable[];
  validationByteLength: number;
  paymentByteLength: number;
} {
  const compiledValidation = compileValidationRulesMetafield(
    params.validationRules
  );
  const compiledPayment = compilePaymentRulesMetafield(params.paymentRules);

  return {
    metafields: [
      {
        ownerId: params.cartValidationOwnerId,
        namespace: APP_METAFIELD_NAMESPACE,
        key: VALIDATION_METAFIELD_KEY,
        type: "json",
        value: compiledValidation.value
      },
      {
        ownerId: params.paymentCustomizationOwnerId,
        namespace: APP_METAFIELD_NAMESPACE,
        key: PAYMENT_METAFIELD_KEY,
        type: "json",
        value: compiledPayment.value
      }
    ],
    validationByteLength: compiledValidation.byteLength,
    paymentByteLength: compiledPayment.byteLength
  };
}

/**
 * Registers both TermsLock Functions (`termslock-checkout-validator` and `termslock-payment-gate`)
 * via `cartValidationCreate` and `paymentCustomizationCreate` supporting both `functionHandle`
 * and `functionId` (2026-04 / 2026-10) and initializes `$app:termslock` metafields.
 */
export async function registerTermsLockFunctions(
  client: AdminGraphQLClient,
  params: {
    validationFunctionId?: string;
    validationFunctionHandle?: string;
    paymentFunctionId?: string;
    paymentFunctionHandle?: string;
    validationRules: TermsLockRulesConfig;
    paymentRules: TermsLockPaymentRulesConfig;
  }
): Promise<{
  cartValidationId: string;
  paymentCustomizationId: string;
  validationFunctionHandle: string;
  paymentFunctionHandle: string;
}> {
  const compiledValidation = compileValidationRulesMetafield(
    params.validationRules
  );
  const compiledPayment = compilePaymentRulesMetafield(params.paymentRules);

  const validationFunctionHandle =
    params.validationFunctionHandle ?? CHECKOUT_VALIDATOR_FUNCTION_HANDLE;
  const paymentFunctionHandle =
    params.paymentFunctionHandle ?? PAYMENT_GATE_FUNCTION_HANDLE;

  const validationResp = await client.request<{
    cartValidationCreate: {
      cartValidation?: { id: string; title: string; enabled: boolean };
      userErrors: { field: string[]; message: string; code?: string }[];
    };
  }>(CART_VALIDATION_CREATE_MUTATION, {
    functionId: params.validationFunctionId,
    functionHandle: validationFunctionHandle,
    title: "TermsLock: B2B PO, Billing Address & MOQ Validator",
    blockOnFailure: true,
    metafields: [
      {
        namespace: APP_METAFIELD_NAMESPACE,
        key: VALIDATION_METAFIELD_KEY,
        type: "json",
        value: compiledValidation.value
      }
    ]
  });

  const valErrors = validationResp.data?.cartValidationCreate?.userErrors ?? [];
  if (valErrors.length > 0) {
    throw new Error(
      `cartValidationCreate failed: ${valErrors.map((e) => e.message).join("; ")}`
    );
  }

  const paymentResp = await client.request<{
    paymentCustomizationCreate: {
      paymentCustomization?: { id: string; title: string; enabled: boolean };
      userErrors: { field: string[]; message: string; code?: string }[];
    };
  }>(PAYMENT_CUSTOMIZATION_CREATE_MUTATION, {
    functionId: params.paymentFunctionId,
    functionHandle: paymentFunctionHandle,
    title: "TermsLock: Net-30 & Wholesale Payment Method Gate",
    enabled: true,
    metafields: [
      {
        namespace: APP_METAFIELD_NAMESPACE,
        key: PAYMENT_METAFIELD_KEY,
        type: "json",
        value: compiledPayment.value
      }
    ]
  });

  const payErrors =
    paymentResp.data?.paymentCustomizationCreate?.userErrors ?? [];
  if (payErrors.length > 0) {
    throw new Error(
      `paymentCustomizationCreate failed: ${payErrors.map((e) => e.message).join("; ")}`
    );
  }

  return {
    cartValidationId:
      validationResp.data?.cartValidationCreate?.cartValidation?.id ?? "",
    paymentCustomizationId:
      paymentResp.data?.paymentCustomizationCreate?.paymentCustomization?.id ??
      "",
    validationFunctionHandle,
    paymentFunctionHandle
  };
}

/**
 * Syncs updated merchant rule configurations to `$app:termslock` metafields via `metafieldsSet`.
 */
export async function syncRulesToShopifyAdmin(
  client: AdminGraphQLClient,
  params: {
    cartValidationOwnerId: string;
    paymentCustomizationOwnerId: string;
    validationRules: TermsLockRulesConfig;
    paymentRules: TermsLockPaymentRulesConfig;
  }
): Promise<{
  updatedCount: number;
  validationByteLength: number;
  paymentByteLength: number;
}> {
  const { metafields, validationByteLength, paymentByteLength } =
    buildMetafieldsSetVariables(params);

  const response = await client.request<{
    metafieldsSet: {
      metafields?: { id: string; namespace: string; key: string }[];
      userErrors: { field: string[]; message: string; code?: string }[];
    };
  }>(METAFIELDS_SET_MUTATION, { metafields });

  const userErrors = response.data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(
      `metafieldsSet failed: ${userErrors.map((e) => e.message).join("; ")}`
    );
  }

  return {
    updatedCount: response.data?.metafieldsSet?.metafields?.length ?? 0,
    validationByteLength,
    paymentByteLength
  };
}
