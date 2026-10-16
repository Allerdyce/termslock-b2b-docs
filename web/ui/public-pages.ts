/**
 * TermsLock Public Zero-Login Pages: /privacy and /demo
 * Serves authentic, compliant, zero-login HTML pages for App Store submission.
 */

export function renderPrivacyPolicyHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Privacy Policy &amp; GDPR Compliance — TermsLock: B2B PO &amp; Net-30</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Inter", Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #F6F7F9;
      color: #111827;
      font-family: var(--font-family);
      font-size: 15px;
      line-height: 1.6;
      padding: 40px 20px;
    }
    .container {
      max-width: 820px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      padding: 40px 48px;
    }
    .header {
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #DEF7EC;
      color: #03543F;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6B7280;
      font-size: 14px;
    }
    h2 {
      font-size: 19px;
      font-weight: 600;
      color: #111827;
      margin-top: 32px;
      margin-bottom: 12px;
      border-bottom: 1px solid #F3F4F6;
      padding-bottom: 6px;
    }
    p, ul {
      margin-bottom: 16px;
      color: #374151;
    }
    ul {
      padding-left: 24px;
    }
    li {
      margin-bottom: 8px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      background: #F3F4F6;
      padding: 2px 6px;
      border-radius: 4px;
      color: #1F2937;
    }
    .callout {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px 0;
      color: #166534;
      font-size: 14px;
    }
    .footer {
      border-top: 1px solid #E5E7EB;
      margin-top: 40px;
      padding-top: 20px;
      font-size: 13px;
      color: #6B7280;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    a {
      color: #059669;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <main class="container">
    <header class="header">
      <div class="badge">✔ Zero-External PII Architecture</div>
      <h1>Privacy Policy &amp; GDPR Compliance</h1>
      <p class="subtitle">TermsLock: B2B PO &amp; Net-30 &bull; Effective Date: October 15, 2026</p>
    </header>

    <section>
      <div class="callout">
        <strong>Executive Summary:</strong> TermsLock does not collect, sell, or persist any customer personally identifiable information (PII) to external databases. All checkout validations and payment method customisations execute inside isolated WebAssembly environments with zero external network connectivity.
      </div>

      <h2>1. About TermsLock and EvidencePair LLC</h2>
      <p>TermsLock: B2B PO &amp; Net-30 (&ldquo;TermsLock&rdquo;, &ldquo;the App&rdquo;) is developed and operated by <strong>EvidencePair LLC</strong> (&ldquo;EvidencePair&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). We provide wholesale order validation and payment customization capabilities for merchants.</p>
      <p>Data Protection Officer contact: <a href="mailto:support@evidencepair.com">support@evidencepair.com</a></p>

      <h2>2. Zero-External PII Persistence Architecture</h2>
      <p>Unlike conventional web applications, TermsLock is architected from the ground up for zero external data retention:</p>
      <ul>
        <li><strong>Stateless WebAssembly Execution:</strong> Checkout validation rules (Purchase Order requirement, MOQ thresholds, case-pack multiples, and freight P.O. Box restrictions) and payment customizations (Net-30 unlocking and credit card caps) execute inside Shopify's native, air-gapped WebAssembly engine during checkout.</li>
        <li><strong>Zero Outbound Network Calls:</strong> Shopify Functions operate under strict runtime constraints with <strong>zero network access</strong>. Functions cannot transmit cart data, customer names, shipping addresses, or payment instruments to external servers.</li>
        <li><strong>App-Owned Metafield Configuration:</strong> Merchant business rules are compiled and stored exclusively inside the merchant's store database using App-Owned Metafields (<code>namespace: "$app:termslock"</code>). EvidencePair maintains zero external databases storing merchant customer records.</li>
      </ul>

      <h2>3. Mandatory GDPR Compliance Webhooks</h2>
      <p>TermsLock fully implements and subscribes to all mandatory GDPR webhooks under the Shopify <code>2026-10</code> API specifications:</p>
      <ul>
        <li><code>customers/data_request</code>: Evaluates incoming requests verified with timing-safe HMAC-SHA256 signatures. Returns confirmation that 0 customer records are retained outside the store.</li>
        <li><code>customers/redact</code>: Verifies the HMAC-SHA256 signature and returns confirmation that no customer records exist to redact.</li>
        <li><code>shop/redact</code>: Verifies the HMAC-SHA256 signature upon store uninstallation. All App-Owned Metafields are automatically purged by the platform.</li>
      </ul>

      <h2>4. Access Scopes and Authorisation</h2>
      <p>TermsLock requests the minimum required Shopify Admin API access scopes:</p>
      <ul>
        <li><code>write_validations</code>: Required to register the checkout validation function and store rule configuration metafields.</li>
        <li><code>write_payment_customizations</code>: Required to register the payment customization function.</li>
        <li><code>read_products</code>: Used strictly at checkout to evaluate Freight/Pallet SKUs and case-pack multiples.</li>
      </ul>

      <h2>5. Merchant and Buyer Rights</h2>
      <p>Because TermsLock does not persist or retain buyer personal data externally, data subject requests (access, rectification, portability, and erasure under GDPR and CCPA) are handled natively within the merchant's store admin. For technical inquiries or verification audits, please contact us at <a href="mailto:support@evidencepair.com">support@evidencepair.com</a>.</p>

      <h2>6. Security</h2>
      <p>All communication with our cloud infrastructure uses Transport Layer Security (TLS 1.3). Webhook signatures are validated using cryptographically secure timing-safe comparisons.</p>
    </section>

    <footer class="footer">
      <div>&copy; 2026 EvidencePair LLC. All rights reserved.</div>
      <div>
        <a href="/demo">Interactive Demo</a> &bull;
        <a href="mailto:support@evidencepair.com">Contact Support</a>
      </div>
    </footer>
  </main>
</body>
</html>`;
}

export function renderDemoPageHtml(videoPath?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Interactive Demo &amp; Video Walkthrough — TermsLock: B2B PO &amp; Net-30</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Inter", Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #F6F7F9;
      color: #111827;
      font-family: var(--font-family);
      font-size: 14px;
      line-height: 1.5;
      padding: 32px 16px 64px;
    }
    .demo-container {
      max-width: 1040px;
      margin: 0 auto;
    }
    .demo-header {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 24px 32px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .demo-title-group h1 {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
    }
    .demo-title-group p {
      color: #6B7280;
      font-size: 13.5px;
      margin-top: 4px;
    }
    .demo-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #DEF7EC;
      color: #03543F;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      white-space: nowrap;
    }
    .demo-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }
    .demo-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      padding: 28px 32px;
    }
    .demo-card h2 {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 6px;
    }
    .demo-card p {
      color: #6B7280;
      font-size: 13.5px;
      margin-bottom: 16px;
    }
    .video-wrapper {
      position: relative;
      background: #111827;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      margin-bottom: 16px;
    }
    video {
      width: 100%;
      height: auto;
      max-height: 540px;
      display: block;
      background: #000;
    }
    .video-fallback {
      padding: 32px;
      text-align: center;
      color: #9CA3AF;
      font-size: 14px;
    }
    .steps-list {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 20px;
    }
    @media (max-width: 768px) {
      .steps-list { grid-template-columns: 1fr; }
    }
    .step-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px;
    }
    .step-number {
      display: inline-block;
      width: 24px;
      height: 24px;
      background: #111827;
      color: #FFF;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      line-height: 24px;
      margin-bottom: 8px;
    }
    .step-title {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }
    .step-desc {
      font-size: 12.5px;
      color: #6B7280;
      line-height: 1.4;
    }
    .interactive-link-box {
      margin-top: 24px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .interactive-link-text h3 {
      font-size: 15px;
      font-weight: 600;
      color: #166534;
    }
    .interactive-link-text p {
      font-size: 13px;
      color: #15803D;
      margin: 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      font-size: 13.5px;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-primary {
      background: #059669;
      color: #FFFFFF;
      border: 1px solid #059669;
    }
    .btn-primary:hover {
      background: #047857;
    }
    .btn-secondary {
      background: #FFFFFF;
      color: #111827;
      border: 1px solid #D1D5DB;
    }
    .btn-secondary:hover {
      background: #F9FAFB;
    }
    .demo-footer {
      margin-top: 32px;
      text-align: center;
      font-size: 13px;
      color: #6B7280;
    }
    .demo-footer a {
      color: #059669;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="demo-container">
    <header class="demo-header">
      <div class="demo-title-group">
        <h1>TermsLock: B2B PO &amp; Net-30</h1>
        <p>Public Interactive Product Demo &amp; Screencast Walkthrough</p>
      </div>
      <div class="demo-badge">✔ Shopify 2026-10 Pure Wasm</div>
    </header>

    <div class="demo-grid">
      <!-- VIDEO WALKTHROUGH CARD -->
      <section class="demo-card">
        <h2>Recorded Video Screencast</h2>
        <p>Watch a complete 3-step walkthrough of B2B purchase order validation and Net-30 payment method customization.</p>

        <div class="video-wrapper">
          <video controls playsinline preload="metadata">
            <source src="${videoPath ?? "/demo-video.webm"}" type="video/webm" />
            <source src="/demo-video.mp4" type="video/mp4" />
            <div class="video-fallback">
              <p>Your browser does not support inline video playback.</p>
              <p><a href="${videoPath ?? "/demo-video.webm"}" download style="color:#A7F3D0;">Download Walkthrough Screencast (WebM)</a></p>
            </div>
          </video>
        </div>

        <div class="steps-list">
          <div class="step-box">
            <span class="step-number">1</span>
            <div class="step-title">Configure B2B Rules</div>
            <div class="step-desc">Set corporate PO format <code>^PO-[0-9]{6}$</code> for orders &ge; $1,000 and $500 Wholesale MOQ.</div>
          </div>
          <div class="step-box">
            <span class="step-number">2</span>
            <div class="step-title">Approved Net-30 Buyer</div>
            <div class="step-desc">Test with PO <code>PO-849201</code>: Net-30 Corporate Invoice is promoted to the #1 position.</div>
          </div>
          <div class="step-box">
            <span class="step-number">3</span>
            <div class="step-title">Blocked Invalid Buyer</div>
            <div class="step-desc">Test with <code>INVALID-123</code> and P.O. Box 409: Inline field-specific errors block checkout.</div>
          </div>
        </div>

        <div class="interactive-link-box">
          <div class="interactive-link-text">
            <h3>Try the Live Rule Builder &amp; Simulator</h3>
            <p>Experience the full Shopify Polaris Admin interface directly in your browser.</p>
          </div>
          <div>
            <a href="/" class="btn btn-primary">Open Live Simulator &rarr;</a>
          </div>
        </div>
      </section>
    </div>

    <footer class="demo-footer">
      <p>&copy; 2026 EvidencePair LLC &bull; <a href="/privacy">Privacy &amp; GDPR Policy</a> &bull; <a href="mailto:support@evidencepair.com">support@evidencepair.com</a></p>
    </footer>
  </div>
</body>
</html>`;
}
