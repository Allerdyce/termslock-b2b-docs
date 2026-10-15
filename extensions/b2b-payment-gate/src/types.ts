export interface PaymentMethodInput {
  id: string;
  name: string;
}

export interface PaymentCustomerInput {
  hasAnyTag: boolean;
  /** Optional explicit tag list for simulator/granular tag matching */
  tags?: string[];
}

export interface PaymentRunInput {
  cart: {
    poNumber?: string | null;
    cost: {
      totalAmount: {
        amount: string;
      };
    };
    buyerIdentity?: {
      customer?: PaymentCustomerInput | null;
      purchasingCompany?: {
        company: {
          id: string;
        };
      } | null;
    } | null;
  };
  paymentMethods: PaymentMethodInput[];
  paymentCustomization?: {
    metafield?: {
      value: string;
    } | null;
  } | null;
}

export interface HideOperation {
  paymentMethodId: string;
}

export interface MoveOperation {
  paymentMethodId: string;
  index: number;
}

export interface RenameOperation {
  paymentMethodId: string;
  name: string;
}

export type PaymentOperation =
  | { hide: HideOperation }
  | { move: MoveOperation }
  | { rename: RenameOperation };

export interface PaymentFunctionRunResult {
  operations: PaymentOperation[];
}

export interface TermsLockPaymentRulesConfig {
  version: "2026-10";
  enabled: boolean;
  requirePoForNet30: boolean;
  poRegexPattern: string;
  net30MethodKeywords: string[];
  authorizedNet30Tags: string[];
  promoteNet30WhenUnlocked: boolean;
  renamedNet30Label: string;
  hideCodForB2B: boolean;
  hideCodSubtotalThreshold: number;
  codMethodKeywords: string[];
  hideHighFeeCardsAboveThreshold: boolean;
  highValueCardThreshold: number;
  highFeeCardKeywords: string[];
}
