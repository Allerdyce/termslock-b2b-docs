import type { TermsLockPaymentRulesConfig } from "./types.ts";
import { DEFAULT_PAYMENT_RULES_CONFIG } from "./run.ts";
import type { AdminUiComponentNode } from "../../b2b-checkout-validator/src/AdminUiExtension.ts";

/**
 * Shopify Admin UI Extension specification for `admin.payment-customization.render`.
 * Uses strictly pre-built Shopify Admin UI Extension components (AdminBlock, BlockStack,
 * TextField, Checkbox, Banner) inside Shopify Settings -> Payments -> Customizations.
 */
export const ADMIN_PAYMENT_CUSTOMIZATION_TARGET =
  "admin.payment-customization.render" as const;

export function buildPaymentCustomizationAdminExtensionTree(
  config: TermsLockPaymentRulesConfig = DEFAULT_PAYMENT_RULES_CONFIG
): AdminUiComponentNode {
  return {
    component: "AdminBlock",
    props: {
      title: "TermsLock: Net-30 Invoice & B2B Payment Customization"
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
              title: "Net-30 & High-Value Payment Gate (2026-10)"
            }
          },
          {
            component: "TextField",
            props: {
              label: "Approved B2B Customer Tags",
              value: config.authorizedNet30Tags.join(", ")
            }
          },
          {
            component: "Checkbox",
            props: {
              label: "Hide Net-30 Invoice unless a valid PO number is entered",
              checked: config.requirePoForNet30
            }
          },
          {
            component: "TextField",
            props: {
              label: "Hide Credit Card Gateways on Wholesale Orders Above ($ USD)",
              value: String(config.highValueCardThreshold)
            }
          },
          {
            component: "Checkbox",
            props: {
              label: "Hide Cash on Delivery (COD) on B2B orders",
              checked: config.hideCodForB2B
            }
          }
        ]
      }
    ]
  };
}
