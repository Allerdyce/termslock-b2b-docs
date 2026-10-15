#!/usr/bin/env python3
"""
Generates flattened 24-bit RGB PNG assets (no alpha channel, color_type=2)
for the TermsLock Shopify App Store submission kit in docs/shopify-store/screenshots/:
  1. app-icon-1200x1200.png (1200x1200)
  2. 01-b2b-po-number-checkout-validation.png (1600x900)
  3. 02-net30-payment-method-customization.png (1600x900)
  4. 03-wholesale-moq-dryrun-simulator.png (1600x900)
"""

import os
import struct
import subprocess
import tempfile
from pathlib import Path
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT_DIR / "docs" / "shopify-store" / "screenshots"
CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


APP_ICON_HTML = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1200px;
    height: 1200px;
    overflow: hidden;
    background: linear-gradient(145deg, #071914 0%, #0b2e23 48%, #0f4634 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    position: relative;
  }
  .grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(16, 185, 129, 0.08) 2px, transparent 2px),
      linear-gradient(90deg, rgba(16, 185, 129, 0.08) 2px, transparent 2px);
    background-size: 60px 60px;
  }
  .glow {
    position: absolute;
    width: 820px;
    height: 820px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, transparent 70%);
    top: 190px;
    left: 190px;
  }
  .shield-card {
    position: relative;
    z-index: 2;
    width: 780px;
    height: 760px;
    background: linear-gradient(180deg, #11382b 0%, #0b241c 100%);
    border: 4px solid rgba(52, 211, 153, 0.45);
    border-radius: 110px;
    box-shadow: 0 40px 90px rgba(0, 0, 0, 0.55), inset 0 2px 20px rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 56px;
  }
  .top-pill {
    background: rgba(16, 185, 129, 0.18);
    border: 2px solid #34d399;
    color: #6ee7b7;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 2px;
    padding: 12px 32px;
    border-radius: 999px;
    margin-bottom: 42px;
    text-transform: uppercase;
  }
  .lock-icon {
    width: 210px;
    height: 210px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-radius: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 20px 45px rgba(16, 185, 129, 0.4);
    margin-bottom: 44px;
    border: 4px solid #a7f3d0;
  }
  .po-badge {
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 38px;
    font-weight: 900;
    color: #ffffff;
    background: #064e3b;
    border: 3px solid #34d399;
    padding: 18px 36px;
    border-radius: 24px;
    margin-bottom: 28px;
    letter-spacing: 1px;
  }
  .chips {
    display: flex;
    gap: 18px;
  }
  .chip {
    background: rgba(255, 255, 255, 0.09);
    border: 2px solid rgba(255, 255, 255, 0.22);
    color: #ecfdf5;
    padding: 12px 26px;
    border-radius: 16px;
    font-size: 24px;
    font-weight: 700;
  }
  .brand-title {
    position: relative;
    z-index: 2;
    margin-top: 48px;
    font-size: 64px;
    font-weight: 900;
    letter-spacing: -1.5px;
    color: #ffffff;
  }
  .brand-sub {
    position: relative;
    z-index: 2;
    margin-top: 10px;
    font-size: 28px;
    font-weight: 600;
    color: #6ee7b7;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="glow"></div>
  <div class="shield-card">
    <div class="top-pill">SHOPIFY FUNCTIONS 2026-10</div>
    <div class="lock-icon">
      <svg width="116" height="116" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        <path d="M9 16l2 2 4-4"></path>
      </svg>
    </div>
    <div class="po-badge">PO-10492 • NET-30</div>
    <div class="chips">
      <div class="chip">$.cart.poNumber</div>
      <div class="chip">B2B Billing Gate</div>
      <div class="chip">MOQ 6x/12x</div>
    </div>
  </div>
  <div class="brand-title">TermsLock B2B</div>
  <div class="brand-sub">PO Number, Tax &amp; Net-30 Checkout Governance</div>
</body>
</html>
"""


SCREENSHOT_01_HTML = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1600px;
    height: 900px;
    overflow: hidden;
    background: #0b1714;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    color: #1a1c1d;
    display: flex;
    flex-direction: column;
    padding: 36px 48px;
  }
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 26px;
    color: #ffffff;
  }
  .badge-pill {
    background: #059669;
    color: #ffffff;
    font-weight: 800;
    font-size: 15px;
    padding: 8px 18px;
    border-radius: 999px;
    letter-spacing: 1px;
    text-transform: uppercase;
    display: inline-block;
    margin-bottom: 8px;
  }
  .top-bar h1 {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -0.8px;
  }
  .top-bar p {
    color: #a7f3d0;
    font-size: 18px;
    margin-top: 4px;
  }
  .api-chip {
    background: rgba(16, 185, 129, 0.16);
    border: 2px solid #34d399;
    color: #ecfdf5;
    padding: 14px 22px;
    border-radius: 14px;
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 16px;
    font-weight: 700;
  }
  .split {
    display: grid;
    grid-template-columns: 760px 716px;
    gap: 28px;
    flex: 1;
  }
  .panel {
    background: #ffffff;
    border-radius: 20px;
    padding: 28px 30px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 2px solid #e1e3e5;
    margin-bottom: 18px;
  }
  .panel-title {
    font-size: 22px;
    font-weight: 800;
    color: #111827;
  }
  .status-active {
    background: #dcfce7;
    color: #166534;
    font-weight: 700;
    font-size: 14px;
    padding: 6px 14px;
    border-radius: 999px;
  }
  .field-group {
    margin-bottom: 16px;
  }
  .field-label {
    font-size: 14px;
    font-weight: 700;
    color: #374151;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
  }
  .field-input {
    width: 100%;
    padding: 13px 16px;
    border-radius: 10px;
    border: 2px solid #d1d5db;
    font-size: 16px;
    font-family: 'SF Mono', 'Menlo', monospace;
    background: #f9fafb;
    color: #111827;
    font-weight: 600;
  }
  .field-input--error {
    border-color: #d82c0d;
    background: #fff4f4;
    color: #991b1b;
  }
  .inline-error {
    margin-top: 8px;
    background: #fff4f4;
    border-left: 5px solid #d82c0d;
    padding: 12px 14px;
    border-radius: 8px;
    color: #b91c1c;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
  }
  .target-tag {
    display: inline-block;
    background: #fee2e2;
    color: #991b1b;
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 12px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 5px;
    margin-bottom: 4px;
  }
  .trigger-pills {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }
  .trigger-pill {
    background: #ecfdf5;
    border: 1.5px solid #10b981;
    color: #065f46;
    font-size: 13px;
    font-weight: 700;
    padding: 7px 12px;
    border-radius: 8px;
  }
  .footer-metrics {
    background: #f3f4f6;
    border-radius: 12px;
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 700;
    color: #374151;
  }
  .code-accent {
    font-family: 'SF Mono', 'Menlo', monospace;
    color: #047857;
  }
</style>
</head>
<body>
  <div class="top-bar">
    <div>
      <span class="badge-pill">NATIVE SHOPIFY 2026-10 CHECKOUT VALIDATION</span>
      <h1>B2B PO Number &amp; Corporate Billing Address Gate</h1>
      <p>Enforce regex PO formats &amp; block PO Boxes on LTL freight using native <code>$.cart.poNumber</code> &amp; <code>$.cart.billingAddress</code> targets</p>
    </div>
    <div class="api-chip">Target: purchase.validation.run<br/>Complexity: 19 / 30 pts • 0 Network Calls</div>
  </div>

  <div class="split">
    <div class="panel">
      <div>
        <div class="panel-header">
          <div class="panel-title">TermsLock Rule Builder — PO &amp; Tax Config</div>
          <span class="status-active">ACTIVE • $app:termslock</span>
        </div>

        <div class="field-group">
          <div class="field-label">
            <span>Corporate PO Number Regex Pattern</span>
            <span class="code-accent">Target: $.cart.poNumber</span>
          </div>
          <div class="field-input">^PO-[0-9]{5,10}$</div>
          <div class="trigger-pills">
            <span class="trigger-pill">✓ Purchasing Company Present</span>
            <span class="trigger-pill">✓ Customer Tag: B2B / Net-30</span>
            <span class="trigger-pill">✓ Cart Subtotal ≥ $1,000.00</span>
          </div>
        </div>

        <div class="field-group">
          <div class="field-label">
            <span>Freight &amp; Pallet PO Box Blocker</span>
            <span class="code-accent">Target: $.cart.billingAddress.address1</span>
          </div>
          <div class="field-input">Block P.O. Box when SKU starts with FREIGHT- or PALLET-</div>
        </div>

        <div class="field-group">
          <div class="field-label">
            <span>Wholesale Company &amp; VAT/Tax ID Gate</span>
            <span class="code-accent">Target: $.cart.billingAddress.company</span>
          </div>
          <div class="field-input">Require Legal Entity Name + Optional (VAT|EIN)-[A-Z0-9]{5,15}</div>
        </div>
      </div>

      <div class="footer-metrics">
        <span>Metafield Payload: <span class="code-accent">892 B / 10,240 B (&lt;10 KB)</span></span>
        <span>Wasm Execution: <span class="code-accent">0.42 ms deterministic</span></span>
      </div>
    </div>

    <div class="panel">
      <div>
        <div class="panel-header">
          <div class="panel-title">Live Shopify B2B Checkout — Inline Field Errors</div>
          <span class="status-active" style="background:#fee2e2;color:#991b1b;">CHECKOUT BLOCKED (2 ERRORS)</span>
        </div>

        <div class="field-group">
          <div class="field-label">
            <span>Purchase Order (PO) Number</span>
            <span>Company: Apex Industrial Supply LLC</span>
          </div>
          <div class="field-input field-input--error">INV-994</div>
          <div class="inline-error">
            <div class="target-tag">target: "$.cart.poNumber"</div><br/>
            Invalid PO number format. Must match corporate standard (e.g., PO-10492).
          </div>
        </div>

        <div class="field-group">
          <div class="field-label">
            <span>Billing Address — Street Line 1 (Freight SKU in Cart)</span>
            <span>SKU: FREIGHT-GEN-500</span>
          </div>
          <div class="field-input field-input--error">P.O. Box 8492, Austin TX 78701</div>
          <div class="inline-error">
            <div class="target-tag">target: "$.cart.billingAddress.address1"</div><br/>
            PO Box billing/delivery addresses cannot be used for palletized or LTL freight items. Please provide a physical commercial street address.
          </div>
        </div>
      </div>

      <div class="footer-metrics">
        <span>Buyer Tag: <span class="code-accent">Net-30, B2B</span></span>
        <span>Cart Subtotal: <span class="code-accent">$1,840.00 USD</span></span>
      </div>
    </div>
  </div>
</body>
</html>
"""


SCREENSHOT_02_HTML = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1600px;
    height: 900px;
    overflow: hidden;
    background: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    color: #111827;
    display: flex;
    flex-direction: column;
    padding: 36px 48px;
  }
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 26px;
    color: #ffffff;
  }
  .badge-pill {
    background: #10b981;
    color: #064e3b;
    font-weight: 900;
    font-size: 14px;
    padding: 8px 16px;
    border-radius: 999px;
    letter-spacing: 1px;
    text-transform: uppercase;
    display: inline-block;
    margin-bottom: 8px;
  }
  .top-bar h1 {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -0.8px;
  }
  .top-bar p {
    color: #93c5fd;
    font-size: 18px;
    margin-top: 4px;
  }
  .api-chip {
    background: rgba(59, 130, 246, 0.18);
    border: 2px solid #60a5fa;
    color: #eff6ff;
    padding: 14px 22px;
    border-radius: 14px;
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 16px;
    font-weight: 700;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    flex: 1;
  }
  .card {
    background: #ffffff;
    border-radius: 20px;
    padding: 28px 30px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 18px;
  }
  .card-head h2 {
    font-size: 21px;
    font-weight: 800;
  }
  .scenario-tag {
    font-size: 13px;
    font-weight: 800;
    padding: 6px 14px;
    border-radius: 999px;
  }
  .scenario-locked {
    background: #fef2f2;
    color: #b91c1c;
    border: 1.5px solid #f87171;
  }
  .scenario-unlocked {
    background: #ecfdf5;
    color: #047857;
    border: 1.5px solid #34d399;
  }
  .context-box {
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 18px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 600;
  }
  .gateway-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .gateway-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 18px;
    border-radius: 12px;
    border: 2px solid #e5e7eb;
    font-size: 16px;
    font-weight: 700;
  }
  .gateway-row--hidden {
    background: #fff1f2;
    border-color: #fda4af;
    color: #881337;
  }
  .gateway-row--promoted {
    background: #ecfdf5;
    border-color: #10b981;
    color: #065f46;
  }
  .gateway-row--visible {
    background: #f9fafb;
    border-color: #d1d5db;
    color: #1f2937;
  }
  .op-badge {
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 13px;
    font-weight: 800;
    padding: 5px 12px;
    border-radius: 8px;
  }
  .op-hide {
    background: #e11d48;
    color: #ffffff;
  }
  .op-promote {
    background: #059669;
    color: #ffffff;
  }
  .op-show {
    background: #e5e7eb;
    color: #374151;
  }
  .footer-note {
    background: #f1f5f9;
    padding: 14px 18px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    color: #334155;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="top-bar">
    <div>
      <span class="badge-pill">FUNCTION #2 • B2B PAYMENT METHOD CUSTOMIZATION</span>
      <h1>Net-30 Invoice &amp; High-Value Payment Gateway Locking</h1>
      <p>Dynamically hide Net-30 unless tagged &amp; PO verified; block COD &amp; high-fee cards on $5,000+ wire orders</p>
    </div>
    <div class="api-chip">Target: purchase.payment-customization.run<br/>Complexity: 11 / 30 pts • $app:termslock</div>
  </div>

  <div class="grid">
    <div class="card">
      <div>
        <div class="card-head">
          <h2>Scenario A: Untagged Buyer or Missing PO</h2>
          <span class="scenario-tag scenario-locked">NET-30 HIDDEN</span>
        </div>

        <div class="context-box">
          <span>Customer Tags: <code>Retail</code></span>
          <span>cart.poNumber: <code>(empty)</code></span>
          <span>Cart Total: <code>$1,420.00</code></span>
        </div>

        <div class="gateway-list">
          <div class="gateway-row gateway-row--hidden">
            <span>Net-30 Invoice / Manual Payment</span>
            <span class="op-badge op-hide">HIDE (Missing Net-30 Tag + PO)</span>
          </div>
          <div class="gateway-row gateway-row--hidden">
            <span>Cash on Delivery (COD)</span>
            <span class="op-badge op-hide">HIDE (Subtotal ≥ $1,000)</span>
          </div>
          <div class="gateway-row gateway-row--visible">
            <span>Shopify Payments (Credit Card)</span>
            <span class="op-badge op-show">VISIBLE (#1)</span>
          </div>
          <div class="gateway-row gateway-row--visible">
            <span>ACH / Wire Transfer</span>
            <span class="op-badge op-show">VISIBLE (#2)</span>
          </div>
        </div>
      </div>

      <div class="footer-note">
        <span>Prevents unauthorized buyers from selecting Manual Invoice terms</span>
        <span>0 External API Calls</span>
      </div>
    </div>

    <div class="card">
      <div>
        <div class="card-head">
          <h2>Scenario B: Verified Net-30 Buyer + $6,500 Order</h2>
          <span class="scenario-tag scenario-unlocked">NET-30 UNLOCKED &amp; PROMOTED</span>
        </div>

        <div class="context-box">
          <span>Customer Tags: <code>Net-30, B2B</code></span>
          <span>cart.poNumber: <code>PO-10492 ✓</code></span>
          <span>Cart Total: <code>$6,500.00</code></span>
        </div>

        <div class="gateway-list">
          <div class="gateway-row gateway-row--promoted">
            <span>Net-30 Corporate Invoice (PO Verified)</span>
            <span class="op-badge op-promote">RENAME + MOVE TO #1</span>
          </div>
          <div class="gateway-row gateway-row--visible">
            <span>ACH / Wire Transfer</span>
            <span class="op-badge op-show">VISIBLE (#2)</span>
          </div>
          <div class="gateway-row gateway-row--hidden">
            <span>Shopify Payments (Credit Card)</span>
            <span class="op-badge op-hide">HIDE (Order ≥ $5,000 Threshold)</span>
          </div>
          <div class="gateway-row gateway-row--hidden">
            <span>Cash on Delivery (COD)</span>
            <span class="op-badge op-hide">HIDE (B2B Order)</span>
          </div>
        </div>
      </div>

      <div class="footer-note">
        <span>Saves 2.9% credit card fees on $5,000+ wholesale orders</span>
        <span>Output: 218 B / 20,480 B</span>
      </div>
    </div>
  </div>
</body>
</html>
"""


SCREENSHOT_03_HTML = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1600px;
    height: 900px;
    overflow: hidden;
    background: #111827;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    color: #111827;
    display: flex;
    flex-direction: column;
    padding: 36px 48px;
  }
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    color: #ffffff;
  }
  .badge-pill {
    background: #f59e0b;
    color: #111827;
    font-weight: 900;
    font-size: 14px;
    padding: 8px 16px;
    border-radius: 999px;
    letter-spacing: 1px;
    text-transform: uppercase;
    display: inline-block;
    margin-bottom: 8px;
  }
  .top-bar h1 {
    font-size: 35px;
    font-weight: 800;
    letter-spacing: -0.8px;
  }
  .top-bar p {
    color: #fde68a;
    font-size: 18px;
    margin-top: 4px;
  }
  .tier-chip {
    background: rgba(245, 158, 11, 0.16);
    border: 2px solid #fbbf24;
    color: #fef3c7;
    padding: 14px 22px;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 700;
  }
  .layout {
    display: grid;
    grid-template-columns: 660px 816px;
    gap: 28px;
    flex: 1;
  }
  .card {
    background: #ffffff;
    border-radius: 20px;
    padding: 26px 28px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  }
  .card-title {
    font-size: 21px;
    font-weight: 800;
    padding-bottom: 14px;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sim-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }
  .sim-box {
    background: #f9fafb;
    border: 1.5px solid #d1d5db;
    border-radius: 10px;
    padding: 10px 14px;
  }
  .sim-box label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .sim-box div {
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 15px;
    font-weight: 800;
    color: #111827;
  }
  .rule-item {
    background: #f8fafc;
    border-left: 5px solid #059669;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 12px;
  }
  .rule-item h4 {
    font-size: 15px;
    font-weight: 800;
    margin-bottom: 4px;
  }
  .rule-item p {
    font-size: 13px;
    color: #4b5563;
    font-weight: 600;
  }
  .sim-output-card {
    background: #fff4f4;
    border: 2px solid #f87171;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 12px;
  }
  .sim-output-card code {
    display: inline-block;
    background: #991b1b;
    color: #ffffff;
    font-weight: 800;
    font-size: 12px;
    padding: 3px 8px;
    border-radius: 5px;
    margin-bottom: 6px;
  }
  .sim-output-card p {
    font-size: 14px;
    font-weight: 700;
    color: #7f1d1d;
  }
  .telemetry-bar {
    background: #064e3b;
    color: #ecfdf5;
    padding: 14px 18px;
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 13px;
    font-weight: 700;
  }
</style>
</head>
<body>
  <div class="top-bar">
    <div>
      <span class="badge-pill">WHOLESALE MOQ • CASE-PACK MULTIPLIERS • DRY-RUN SIMULATOR</span>
      <h1>Test Wholesale MOQ, Case-Packs &amp; Hazmat Rules in Real Time</h1>
      <p>Interactive Dry-Run Checkout Simulator previews exact Function errors &amp; hidden gateways before saving</p>
    </div>
    <div class="tier-chip">Plans: $39/mo B2B Standard • $99/mo Plus Enterprise<br/>14-Day Free Trial • 32 Automated Vitest Suite</div>
  </div>

  <div class="layout">
    <div class="card">
      <div>
        <div class="card-title">
          <span>Wholesale MOQ, Case-Pack &amp; Hazmat Gates</span>
          <span style="font-size:13px;background:#dcfce7;color:#166534;padding:5px 12px;border-radius:999px;">4 GATES ENABLED</span>
        </div>

        <div class="rule-item">
          <h4>Gate 1: PO Number Regex &amp; $1,000 Subtotal Trigger ($.cart.poNumber)</h4>
          <p>Requires valid <code>^PO-[0-9]{5,10}$</code> when purchasingCompany is active or cart ≥ $1,000.</p>
        </div>

        <div class="rule-item">
          <h4>Gate 2: Freight PO Box Blocker &amp; Billing Company ($.cart.billingAddress.*)</h4>
          <p>Blocks P.O. Boxes on <code>Freight / Pallet</code> SKUs &amp; enforces corporate billing entity name.</p>
        </div>

        <div class="rule-item">
          <h4>Gate 3: $500 Wholesale MOQ &amp; 6x / 12x Case-Pack Multipliers ($.cart)</h4>
          <p>Enforces $500.00 minimum B2B subtotal and requires multiples of 6 or 12 units per SKU.</p>
        </div>

        <div class="rule-item">
          <h4>Gate 4: Hazmat Incompatible SKU Matrix ($.cart)</h4>
          <p>Prevents <code>Hazmat-Class-3</code> flammable items from shipping with <code>Hazmat-Oxidizer</code>.</p>
        </div>
      </div>

      <div class="telemetry-bar">
        <span>rules_config: 914 B / 10,240 B</span>
        <span>payment_rules: 488 B / 10,240 B</span>
      </div>
    </div>

    <div class="card">
      <div>
        <div class="card-title">
          <span>Interactive Dry-Run Checkout Simulator</span>
          <span style="font-size:13px;background:#fef3c7;color:#92400e;padding:5px 12px;border-radius:999px;">LIVE PREVIEW</span>
        </div>

        <div class="sim-grid">
          <div class="sim-box">
            <label>Sample Cart Subtotal</label>
            <div>$340.00 USD (Under $500 MOQ)</div>
          </div>
          <div class="sim-box">
            <label>Customer Tag &amp; PO Number</label>
            <div>Tag: Net-30 | PO: PO-10492</div>
          </div>
          <div class="sim-box">
            <label>Line Item #1 (Case-Pack 6x)</label>
            <div>SKU: CASE6-VALVE • Qty: 7 units</div>
          </div>
          <div class="sim-box">
            <label>Billing Company &amp; Address</label>
            <div>Apex Industrial • PO Box 550</div>
          </div>
        </div>

        <div class="sim-output-card">
          <code>target: "$.cart" — Wholesale MOQ Gate</code>
          <p>Wholesale minimum order subtotal is $500.00 (current subtotal: $340.00).</p>
        </div>

        <div class="sim-output-card">
          <code>target: "$.cart" — Case-Pack Multiplier Gate</code>
          <p>Wholesale case-pack rule: Item 'CASE6-VALVE' must be ordered in multiples of 6 units (received quantity: 7).</p>
        </div>

        <div class="sim-output-card" style="margin-bottom:0;">
          <code>target: "$.cart.billingAddress.address1" — Freight PO Box Gate</code>
          <p>PO Box billing/delivery addresses cannot be used for palletized or LTL freight items.</p>
        </div>
      </div>

      <div class="telemetry-bar">
        <span>Payment Preview: Net-30 Unlocked (#1) | COD Hidden</span>
        <span>Output JSON: 612 B / 20,480 B</span>
      </div>
    </div>
  </div>
</body>
</html>
"""


def render_html_to_rgb_png(html_content: str, output_path: Path, width: int, height: int) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmpdir:
        html_file = Path(tmpdir) / "slide.html"
        raw_png = Path(tmpdir) / "raw.png"
        html_file.write_text(html_content, encoding="utf-8")

        cmd = [
            CHROME_BIN,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            f"--window-size={width},{height}",
            "--default-background-color=ffffffff",
            f"--screenshot={raw_png}",
            f"file://{html_file}",
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        with Image.open(raw_png) as img:
            rgb_img = img.convert("RGB")
            if rgb_img.size != (width, height):
                rgb_img = rgb_img.resize((width, height), Image.Resampling.LANCZOS)
            rgb_img.save(output_path, format="PNG", optimize=True)


def verify_png_is_24bit_rgb(path: Path, expected_w: int, expected_h: int) -> None:
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"{path.name}: invalid PNG signature"
    w, h, bit_depth, color_type = struct.unpack(">IIBB", data[16:26])
    assert (w, h) == (expected_w, expected_h), f"{path.name}: expected {expected_w}x{expected_h}, got {w}x{h}"
    assert bit_depth == 8, f"{path.name}: expected 8-bit depth, got {bit_depth}"
    assert color_type == 2, f"{path.name}: expected color_type=2 (24-bit RGB, no alpha), got {color_type}"
    print(f"Verified {path.name}: {w}x{h}, 24-bit RGB (color_type={color_type}, bit_depth={bit_depth}), {len(data):,} bytes")


def main() -> None:
    assets = [
        (APP_ICON_HTML, OUT_DIR / "app-icon-1200x1200.png", 1200, 1200),
        (SCREENSHOT_01_HTML, OUT_DIR / "01-b2b-po-number-checkout-validation.png", 1600, 900),
        (SCREENSHOT_02_HTML, OUT_DIR / "02-net30-payment-method-customization.png", 1600, 900),
        (SCREENSHOT_03_HTML, OUT_DIR / "03-wholesale-moq-dryrun-simulator.png", 1600, 900),
    ]
    for html_str, out_path, w, h in assets:
        render_html_to_rgb_png(html_str, out_path, w, h)
        verify_png_is_24bit_rgb(out_path, w, h)


if __name__ == "__main__":
    main()
