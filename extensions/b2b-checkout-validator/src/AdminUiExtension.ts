import type { TermsLockRulesConfig } from "./types.ts";
import { DEFAULT_RULES_CONFIG } from "./run.ts";

/**
 * Shopify Admin UI Extension specification for `admin.checkout-validation.render`.
 * Uses strictly pre-built Shopify Admin UI Extension components (AdminBlock, BlockStack,
 * TextField, Select, Checkbox, Banner) with zero custom HTML/CSS inside Shopify Settings -> Checkout.
 */
export const ADMIN_CHECKOUT_VALIDATION_TARGET =
  "admin.checkout-validation.render" as const;

export interface AdminUiComponentNode {
  component:
    | "AdminBlock"
    | "BlockStack"
    | "InlineStack"
    | "TextField"
    | "Select"
    | "Checkbox"
    | "Banner"
    | "Text";
  props: Record<string, unknown>;
  children?: AdminUiComponentNode[];
}

export function buildCheckoutValidationAdminExtensionTree(
  config: TermsLockRulesConfig = DEFAULT_RULES_CONFIG
): AdminUiComponentNode {
  return {
    component: "AdminBlock",
    props: {
      title: "TermsLock: B2B PO, Tax & Wholesale MOQ Rules"
    },
    children: [
      {
        component: "BlockStack",
        props: { gap: "base" },
        children: [
          {
            component: "Banner",
            props: {
              tone: "info",
              title: "Native B2B Checkout Validation (2026-10)"
            }
          },
          {
            component: "Select",
            props: {
              label: "Purchase Order (PO) Format Preset",
              value: config.poRule.regexPattern,
              options: [
                {
                  label: "Standard Corporate (PO-XXXXXX)",
                  value: "^PO-[0-9]{6}$"
                },
                { label: "Numeric Only", value: "^[0-9]{5,10}$" },
                { label: "Any Non-Empty PO", value: "^.+$" }
              ]
            }
          },
          {
            component: "TextField",
            props: {
              label: "PO Number Regular Expression ($.cart.poNumber)",
              value: config.poRule.regexPattern
            }
          },
          {
            component: "TextField",
            props: {
              label: "Minimum Order Subtotal Requiring a PO ($ USD)",
              value: String(config.poRule.subtotalThreshold)
            }
          },
          {
            component: "TextField",
            props: {
              label: "Wholesale Minimum Order Subtotal ($ USD)",
              value: String(config.moqRule.minimumSubtotal)
            }
          },
          {
            component: "Checkbox",
            props: {
              label: "Enforce 6-unit / 12-unit case-pack multiples",
              checked: config.moqRule.enabled
            }
          },
          {
            component: "Checkbox",
            props: {
              label: "Block P.O. Box addresses on freight & pallet items",
              checked: config.billingRule.blockPoBoxOnFreight
            }
          },
          {
            component: "Checkbox",
            props: {
              label: "Block incompatible hazmat items in the same cart",
              checked: config.hazmatRule.enabled
            }
          }
        ]
      }
    ]
  };
}
