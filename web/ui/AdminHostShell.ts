import React from "react";

export interface AdminHostShellProps {
  children?: React.ReactNode;
  storeName?: string;
  activeAppName?: string;
  planName?: string;
}

const e = React.createElement;

export function AdminHostShell({
  children,
  storeName = "Apex Industrial B2B",
  activeAppName = "TermsLock B2B Rules",
  planName = "Shopify Plus & Enterprise Wholesale Plan"
}: AdminHostShellProps): React.ReactElement {
  return e(
    "div",
    { className: "shopify-admin-host-frame" },
    // 1. TOP DARK ADMIN BAR (48px, #1A1A1A)
    e(
      "header",
      { className: "shopify-host-topbar" },
      e(
        "div",
        { className: "shopify-host-topbar-left" },
        e(
          "div",
          { className: "shopify-host-logo-wrapper" },
          e(
            "svg",
            {
              className: "shopify-host-logo-icon",
              viewBox: "0 0 24 24",
              width: "22",
              height: "22",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2"
            },
            e("path", { d: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" }),
            e("line", { x1: "3", y1: "6", x2: "21", y2: "6" }),
            e("path", { d: "M16 10a4 4 0 0 1-8 0" })
          )
        ),
        e(
          "div",
          { className: "shopify-host-store-switcher" },
          e("span", { className: "shopify-host-store-name" }, storeName),
          e("span", { className: "shopify-host-plan-badge" }, "Plus"),
          e(
            "svg",
            { width: "12", height: "12", viewBox: "0 0 20 20", fill: "currentColor" },
            e("path", {
              fillRule: "evenodd",
              d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z",
              clipRule: "evenodd"
            })
          )
        )
      ),
      e(
        "div",
        { className: "shopify-host-topbar-center" },
        e(
          "div",
          { className: "shopify-host-search-bar" },
          e(
            "svg",
            {
              width: "14",
              height: "14",
              viewBox: "0 0 20 20",
              fill: "currentColor",
              className: "shopify-host-search-icon"
            },
            e("path", {
              fillRule: "evenodd",
              d: "M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z",
              clipRule: "evenodd"
            })
          ),
          e("span", { className: "shopify-host-search-placeholder" }, "Search orders, customers, B2B rules"),
          e("kbd", { className: "shopify-host-search-kbd" }, "⌘K")
        )
      ),
      e(
        "div",
        { className: "shopify-host-topbar-right" },
        e(
          "div",
          { className: "shopify-host-icon-btn", title: "Notifications" },
          e(
            "svg",
            { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
            e("path", { d: "M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" })
          )
        ),
        e(
          "div",
          { className: "shopify-host-avatar", title: planName },
          e("span", null, "AI"),
          e("span", { className: "shopify-host-avatar-status" })
        )
      )
    ),

    // 2. BODY: LEFT SIDEBAR + MAIN CONTENT AREA
    e(
      "div",
      { className: "shopify-host-body" },
      // LEFT ADMIN SIDEBAR (240px, #EBEBEB)
      e(
        "aside",
        { className: "shopify-host-sidebar" },
        e(
          "nav",
          { className: "shopify-host-nav" },
          e(
            "div",
            { className: "shopify-host-nav-group" },
            e(
              "div",
              { className: "shopify-host-nav-item" },
              e(
                "svg",
                { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
                e("path", { d: "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" })
              ),
              e("span", null, "Home")
            ),
            e(
              "div",
              { className: "shopify-host-nav-item" },
              e(
                "svg",
                { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
                e("path", { d: "M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" }),
                e("path", {
                  fillRule: "evenodd",
                  d: "M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z",
                  clipRule: "evenodd"
                })
              ),
              e("span", null, "Orders")
            ),
            e(
              "div",
              { className: "shopify-host-nav-item" },
              e(
                "svg",
                { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
                e("path", {
                  fillRule: "evenodd",
                  d: "M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z",
                  clipRule: "evenodd"
                })
              ),
              e("span", null, "Products")
            ),
            e(
              "div",
              { className: "shopify-host-nav-item" },
              e(
                "svg",
                { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
                e("path", { d: "M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" })
              ),
              e("span", null, "Customers")
            ),
            e(
              "div",
              { className: "shopify-host-nav-item shopify-host-nav-item--b2b" },
              e(
                "svg",
                { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
                e("path", {
                  fillRule: "evenodd",
                  d: "M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm4 0h2v2h-2V5zm-4 4h2v2H7V9zm4 0h2v2h-2V9zm-4 4h2v2H7v-2zm4 0h2v2h-2v-2z",
                  clipRule: "evenodd"
                })
              ),
              e("span", null, "Companies (B2B)"),
              e("span", { className: "shopify-host-b2b-pill" }, "B2B")
            ),
            e(
              "div",
              { className: "shopify-host-nav-item" },
              e(
                "svg",
                { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
                e("path", {
                  fillRule: "evenodd",
                  d: "M5.5 2a3.5 3.5 0 00-3.5 3.5v4.293a3.5 3.5 0 001.025 2.475l5.5 5.5a3.5 3.5 0 004.95 0l4.293-4.293a3.5 3.5 0 000-4.95l-5.5-5.5A3.5 3.5 0 009.793 2H5.5zM4 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z",
                  clipRule: "evenodd"
                })
              ),
              e("span", null, "Discounts")
            )
          ),
          e("div", { className: "shopify-host-nav-divider" }),
          e(
            "div",
            { className: "shopify-host-nav-group" },
            e("span", { className: "shopify-host-nav-heading" }, "Sales channels"),
            e(
              "div",
              { className: "shopify-host-nav-item" },
              e(
                "svg",
                { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
                e("path", {
                  fillRule: "evenodd",
                  d: "M4.083 9h11.834a3 3 0 012.858 3.904l-1.2 4.5A3 3 0 0114.682 19H5.318a3 3 0 01-2.893-2.096l-1.2-4.5A3 3 0 014.083 9zm.917-4a3 3 0 013-3h4a3 3 0 013 3v2H5V5z",
                  clipRule: "evenodd"
                })
              ),
              e("span", null, "Online Store")
            )
          ),
          e("div", { className: "shopify-host-nav-divider" }),
          e(
            "div",
            { className: "shopify-host-nav-group" },
            e("span", { className: "shopify-host-nav-heading" }, "Apps"),
            e(
              "div",
              { className: "shopify-host-nav-item shopify-host-nav-item--active" },
              e("span", { className: "shopify-host-app-icon" }, "🔒"),
              e("span", { className: "shopify-host-app-name" }, activeAppName),
              e("span", { className: "shopify-host-active-indicator" })
            )
          )
        ),
        e(
          "div",
          { className: "shopify-host-sidebar-footer" },
          e(
            "div",
            { className: "shopify-host-nav-item" },
            e(
              "svg",
              { width: "16", height: "16", viewBox: "0 0 20 20", fill: "currentColor" },
              e("path", {
                fillRule: "evenodd",
                d: "M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z",
                clipRule: "evenodd"
              })
            ),
            e("span", null, "Settings")
          )
        )
      ),

      // MAIN EMBEDDED CONTENT WRAPPER
      e(
        "div",
        { className: "shopify-host-main-content" },
        // 3. CONTEXTUAL SAVE BAR (#1A1A1A)
        e(
          "div",
          { className: "shopify-host-save-bar" },
          e(
            "div",
            { className: "shopify-host-save-bar-status" },
            e("span", { className: "shopify-host-status-dot" }),
            e("span", null, "All rules active on checkout (Shopify API v2026-10)")
          ),
          e(
            "div",
            { className: "shopify-host-save-bar-actions" },
            e("span", { id: "rules-save-banner", className: "shopify-host-save-toast" }, "All changes saved"),
            e("button", { type: "button", id: "host-discard-btn", className: "shopify-host-discard-btn" }, "Discard"),
            e("button", { type: "button", id: "save-rules-btn", className: "shopify-host-save-btn" }, "Save")
          )
        ),
        // EMBEDDED POLARIS PAGE
        e("div", { className: "shopify-host-app-viewport" }, children)
      )
    )
  );
}
