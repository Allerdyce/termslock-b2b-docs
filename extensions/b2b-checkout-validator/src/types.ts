export type ValidationErrorTarget =
  | "$.cart"
  | "$.cart.poNumber"
  | "$.cart.billingAddress.company"
  | "$.cart.billingAddress.address1"
  | "$.cart.billingAddress.countryCode"
  | "$.cart.billingAddress.provinceCode"
  | "$.cart.billingAddress.zip";

export interface FunctionError {
  localizedMessage: string;
  target: ValidationErrorTarget;
}

export interface FunctionRunResult {
  errors: FunctionError[];
}

export interface MailingAddressInput {
  company?: string | null;
  address1?: string | null;
  city?: string | null;
  provinceCode?: string | null;
  countryCode?: string | null;
  zip?: string | null;
}

export interface CustomerInput {
  hasAnyTag: boolean;
  numberOfOrders: number;
  /** Optional explicit tag list for multi-rule differentiation in simulator/tests */
  tags?: string[];
}

export interface PurchasingCompanyInput {
  company: {
    id: string;
    name: string;
  };
  location?: {
    id: string;
  } | null;
}

export interface ProductVariantMerchandise {
  __typename?: "ProductVariant";
  id: string;
  sku?: string | null;
  product: {
    hasAnyTag: boolean;
    /** Optional explicit product tag list when populated via aliases or simulator */
    tags?: string[];
  };
}

export interface CustomProductMerchandise {
  __typename: "CustomProduct";
  id: string;
}

export type MerchandiseInput = ProductVariantMerchandise | CustomProductMerchandise;

export interface CartLineInput {
  quantity: number;
  merchandise: MerchandiseInput;
}

export interface RunInput {
  cart: {
    poNumber?: string | null;
    billingAddress?: MailingAddressInput | null;
    cost: {
      subtotalAmount: {
        amount: string;
      };
    };
    buyerIdentity?: {
      customer?: CustomerInput | null;
      purchasingCompany?: PurchasingCompanyInput | null;
    } | null;
    lines: CartLineInput[];
  };
  cartValidation?: {
    metafield?: {
      value: string;
    } | null;
  } | null;
}

export interface PoValidationRuleConfig {
  enabled: boolean;
  requireForPurchasingCompany: boolean;
  requireForCustomerTags: boolean;
  subtotalThreshold: number;
  minLength: number;
  regexPattern: string;
  errorMessageMissing: string;
  errorMessageFormat: string;
}

export interface BillingAddressRuleConfig {
  enabled: boolean;
  blockPoBoxOnFreight: boolean;
  freightSkuPrefixes: string[];
  freightTags: string[];
  requireCompanyForB2B: boolean;
  requireTaxIdPrefixInCompany: boolean;
  taxIdRegexPattern: string;
  allowedCountries: string[];
  requireProvinceCodeForCountries: string[];
  requireZip: boolean;
}

export interface WholesaleMoqRuleConfig {
  enabled: boolean;
  minimumSubtotal: number;
  defaultCasePackMultiple?: number;
  skuCaseMultipliers: Record<string, number>;
  tagCaseMultipliers: Record<string, number>;
}

export interface HazmatCombinationRuleConfig {
  enabled: boolean;
  incompatibleTagPairs: [string, string][];
  incompatibleSkuPrefixPairs: [string, string][];
}

export interface TermsLockRulesConfig {
  version: "2026-10";
  poRule: PoValidationRuleConfig;
  billingRule: BillingAddressRuleConfig;
  moqRule: WholesaleMoqRuleConfig;
  hazmatRule: HazmatCombinationRuleConfig;
}
