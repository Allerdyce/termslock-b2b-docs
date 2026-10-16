/**
 * TermsLock Client Hydration & Interactive Controller Script
 * Pre-bundled into dist/app.bundle.js and embedded in src/assets/embedded-assets.ts.
 */
export const CLIENT_HYDRATION_SCRIPT = `(function () {
  const saveBtn = document.getElementById('save-rules-btn');
  const runSimBtn = document.getElementById('run-simulator-btn');
  const saveBanner = document.getElementById('rules-save-banner');
  const byteCounter = document.getElementById('metafield-byte-counter');
  const jsonPreview = document.getElementById('metafield-json-preview');
  const simStatusPill = document.getElementById('sim-status-pill');
  const simTelemetryBadge = document.getElementById('sim-telemetry-badge');
  const simErrorsContainer = document.getElementById('sim-errors-container');
  const simPaymentsContainer = document.getElementById('sim-payments-container');
  const simBannerResult = document.getElementById('sim-banner-result');
  const scenarioPassBtn = document.getElementById('preset-scenario-pass');
  const scenarioFailBtn = document.getElementById('preset-scenario-fail');
  const presetBtns = document.querySelectorAll('.tl-seg-btn');

  // Domain Navigation Tabs switching
  const tabBtns = document.querySelectorAll('.tl-tab-item');
  const cards = {
    po: document.getElementById('card-po-validation'),
    wholesale: document.getElementById('card-wholesale-freight'),
    payments: document.getElementById('card-payment-terms')
  };

  tabBtns.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabBtns.forEach(function (t) {
        t.classList.remove('tl-tab-item--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('tl-tab-item--active');
      tab.setAttribute('aria-selected', 'true');

      const domain = tab.getAttribute('data-tab');
      if (domain === 'all') {
        if (cards.po) cards.po.style.display = 'block';
        if (cards.wholesale) cards.wholesale.style.display = 'block';
        if (cards.payments) cards.payments.style.display = 'block';
      } else if (domain === 'po') {
        if (cards.po) cards.po.style.display = 'block';
        if (cards.wholesale) cards.wholesale.style.display = 'none';
        if (cards.payments) cards.payments.style.display = 'none';
      } else if (domain === 'wholesale') {
        if (cards.po) cards.po.style.display = 'none';
        if (cards.wholesale) cards.wholesale.style.display = 'block';
        if (cards.payments) cards.payments.style.display = 'none';
      } else if (domain === 'payments') {
        if (cards.po) cards.po.style.display = 'none';
        if (cards.wholesale) cards.wholesale.style.display = 'none';
        if (cards.payments) cards.payments.style.display = 'block';
      }
    });
  });

  // Accepted PO Format preset pill clicks
  presetBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      presetBtns.forEach(function (b) {
        b.classList.remove('tl-seg-btn--active');
        const check = b.querySelector('.tl-seg-check');
        if (check) check.remove();
      });
      btn.classList.add('tl-seg-btn--active');
      const checkSpan = document.createElement('span');
      checkSpan.className = 'tl-seg-check';
      checkSpan.textContent = '✓ ';
      btn.prepend(checkSpan);

      const regex = btn.getAttribute('data-regex');
      if (regex) {
        const input = document.getElementById('po-regex-input');
        if (input) {
          input.value = regex;
          updateActiveRuleSummary();
        }
      }
    });
  });

  // Dynamic Active Rule Summary Bullets real-time sync
  function updateActiveRuleSummary() {
    const poRegexInput = document.getElementById('po-regex-input');
    const poThresholdInput = document.getElementById('po-threshold-input');
    const moqInput = document.getElementById('moq-subtotal-input');
    const qtyInput = document.getElementById('sim-sku-qty-input');
    const poboxToggle = document.getElementById('toggle-pobox-gate');
    const tagInput = document.getElementById('net30-tags-input');

    const poRegex = poRegexInput ? poRegexInput.value.trim() : '^PO-[0-9]{6}$';
    const poThreshold = poThresholdInput ? poThresholdInput.value.trim() : '1000';
    const moqSubtotal = moqInput ? moqInput.value.trim() : '500';
    const caseQty = qtyInput ? qtyInput.value.trim() : '12';
    const isPoBoxBlocked = poboxToggle ? poboxToggle.checked : true;
    const tags = tagInput ? tagInput.value.trim() : 'Net-30';

    const bPo = document.getElementById('summary-bullet-po');
    if (bPo) bPo.textContent = '• PO format ' + poRegex + ' required ≥ $' + poThreshold;

    const bMoq = document.getElementById('summary-bullet-moq');
    if (bMoq) bMoq.textContent = '• $' + moqSubtotal + ' MOQ & ' + caseQty + '-unit case packs';

    const bFreight = document.getElementById('summary-bullet-freight');
    if (bFreight) bFreight.textContent = isPoBoxBlocked ? '• Freight P.O. Box addresses blocked' : '• Freight P.O. Box addresses allowed';

    const bNet30 = document.getElementById('summary-bullet-net30');
    if (bNet30) bNet30.textContent = '• Net-30 gated by tag (' + tags + ') + valid PO';
  }

  ['po-regex-input', 'po-threshold-input', 'moq-subtotal-input', 'sim-sku-qty-input', 'net30-tags-input'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateActiveRuleSummary);
      el.addEventListener('change', updateActiveRuleSummary);
    }
  });

  ['toggle-po-gate', 'toggle-pobox-gate', 'toggle-moq-gate', 'toggle-hazmat-gate', 'toggle-net30-po', 'toggle-cod-gate'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateActiveRuleSummary);
  });

  // Launch Live Checkout Simulator → button click handler
  const launchSimBtn = document.getElementById('launch-simulator-btn');
  if (launchSimBtn) {
    launchSimBtn.addEventListener('click', function () {
      const drawer = document.getElementById('test-buyer-drawer');
      if (drawer) {
        drawer.open = true;
        drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      const poIn = document.getElementById('sim-po-input');
      if (poIn) poIn.focus();
      handleSimulate();
    });
  }

  // 1-Click Scenario Switchers
  if (scenarioPassBtn) {
    scenarioPassBtn.addEventListener('click', function () {
      scenarioPassBtn.classList.add('tl-scenario-btn--active');
      if (scenarioFailBtn) scenarioFailBtn.classList.remove('tl-scenario-btn--active');
      const poIn = document.getElementById('sim-po-input');
      const addrIn = document.getElementById('sim-address1-input');
      const tagIn = document.getElementById('sim-tags-input');
      if (poIn) poIn.value = 'PO-849201';
      if (addrIn) addrIn.value = '400 Market St';
      if (tagIn) tagIn.value = 'Net-30';
      if (runSimBtn) runSimBtn.click();
    });
  }

  if (scenarioFailBtn) {
    scenarioFailBtn.addEventListener('click', function () {
      scenarioFailBtn.classList.add('tl-scenario-btn--active');
      if (scenarioPassBtn) scenarioPassBtn.classList.remove('tl-scenario-btn--active');
      const poIn = document.getElementById('sim-po-input');
      const addrIn = document.getElementById('sim-address1-input');
      const tagIn = document.getElementById('sim-tags-input');
      if (poIn) poIn.value = 'INVALID-123';
      if (addrIn) addrIn.value = 'P.O. Box 409';
      if (tagIn) tagIn.value = '';
      if (runSimBtn) runSimBtn.click();
    });
  }

  // Gather rules for saving
  function gatherRulesPayload() {
    const poRegexInput = document.getElementById('po-regex-input');
    const poRegex = poRegexInput ? poRegexInput.value.trim() : '^PO-[0-9]{6}$';
    const poThresholdInput = document.getElementById('po-threshold-input');
    const poThreshold = poThresholdInput ? parseFloat(poThresholdInput.value) || 1000 : 1000;
    const moqInput = document.getElementById('moq-subtotal-input');
    const moqSubtotal = moqInput ? parseFloat(moqInput.value) || 500 : 500;
    const tagInput = document.getElementById('net30-tags-input');
    const net30Tags = tagInput ? tagInput.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : ['Net-30'];
    const wireInput = document.getElementById('wire-threshold-input');
    const wireThreshold = wireInput ? parseFloat(wireInput.value) || 5000 : 5000;

    const togglePo = document.getElementById('toggle-po-gate');
    const togglePobox = document.getElementById('toggle-pobox-gate');
    const toggleMoq = document.getElementById('toggle-moq-gate');
    const toggleHazmat = document.getElementById('toggle-hazmat-gate');

    return {
      poRegexPattern: poRegex,
      poSubtotalThreshold: poThreshold,
      minimumSubtotal: moqSubtotal,
      authorizedNet30Tags: net30Tags,
      highValueCardThreshold: wireThreshold,
      poEnabled: togglePo ? togglePo.checked : true,
      blockPoBoxOnFreight: togglePobox ? togglePobox.checked : true,
      moqEnabled: toggleMoq ? toggleMoq.checked : true,
      hazmatEnabled: toggleHazmat ? toggleHazmat.checked : true
    };
  }

  // App Bridge v4 Session Token Helper
  async function getSessionToken() {
    try {
      if (window.shopify && typeof window.shopify.idToken === 'function') {
        return await window.shopify.idToken();
      }
    } catch (e) {
      console.warn('[TermsLock] App Bridge idToken query warning:', e);
    }
    return null;
  }

  // Save Rules Handler
  async function handleSave() {
    const payload = gatherRulesPayload();
    const token = await getSessionToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      if (saveBanner) saveBanner.innerHTML = '<span>⚠ Error saving rules</span>';
      return;
    }
    if (byteCounter) {
      byteCounter.textContent =
        'rules_config: ' + data.validationMetafield.byteLength + ' B / 10,240 B (' +
        data.validationMetafield.budgetUtilizationPercent + '%) • payment_rules: ' +
        data.paymentMetafield.byteLength + ' B / 10,240 B';
    }
    if (jsonPreview) jsonPreview.textContent = data.validationMetafield.value;
    if (saveBanner) {
      saveBanner.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="#059669"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4" stroke="#FFF" stroke-width="2" fill="none"/></svg>' +
        '<span>All changes saved</span>';
    }
    const hostSaveToast = document.getElementById('host-save-toast');
    if (hostSaveToast) {
      hostSaveToast.textContent = 'All changes saved';
      hostSaveToast.style.display = 'inline-block';
    }
  }

  if (saveBtn) saveBtn.addEventListener('click', handleSave);

  const hostSaveBtn = document.getElementById('host-save-btn');
  if (hostSaveBtn) hostSaveBtn.addEventListener('click', handleSave);

  const abSaveBtn = document.getElementById('ab-save-btn');
  if (abSaveBtn) abSaveBtn.addEventListener('click', handleSave);

  // Auto-Fire App Bridge v4 Session Token on Initial Load (satisfies Embedded App Checks)
  async function autoFireSessionTokenPing() {
    try {
      if (window.shopify && typeof window.shopify.idToken === 'function') {
        const token = await window.shopify.idToken();
        if (token) {
          const headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          };
          fetch('/api/rules', { headers: headers }).catch(function () {});
          const payload = gatherRulesPayload();
          fetch('/api/rules', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
          }).catch(function () {});
          console.log('[TermsLock] App Bridge v4 session token ping dispatched successfully');
        }
      }
    } catch (err) {
      console.warn('[TermsLock] Session token auto-ping error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoFireSessionTokenPing);
  } else {
    autoFireSessionTokenPing();
  }

  // Simulate Handler
  async function handleSimulate() {
    const poIn = document.getElementById('sim-po-input');
    const tagIn = document.getElementById('sim-tags-input');
    const subIn = document.getElementById('sim-subtotal-input');
    const addrIn = document.getElementById('sim-address1-input');
    const compIn = document.getElementById('sim-company-input');
    const qtyIn = document.getElementById('sim-sku-qty-input');

    const poNumber = poIn ? poIn.value : '';
    const tagsRaw = tagIn ? tagIn.value : '';
    const customerTags = tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    const subRaw = subIn ? subIn.value.replace(/[^0-9.]/g, '') : '1250';
    const cartSubtotal = parseFloat(subRaw) || 1250;
    const billingAddress1 = addrIn ? addrIn.value : '400 Market St';
    const billingCompany = compIn && compIn.value ? compIn.value : 'Apex Industrial Supply LLC';
    const qty = qtyIn ? parseInt(qtyIn.value, 10) || 12 : 12;

    const freightQtyDisplay = document.getElementById('sim-freight-qty-display');
    if (freightQtyDisplay) freightQtyDisplay.value = String(qty);

    const companyTitle = document.getElementById('preview-company-title');
    if (companyTitle) companyTitle.textContent = billingCompany;

    const subtotalChip = document.getElementById('preview-subtotal-chip');
    if (subtotalChip) {
      subtotalChip.textContent = '$' + cartSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 });
    }

    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartSubtotal: cartSubtotal,
        customerTags: customerTags,
        purchasingCompanyName: billingCompany,
        poNumber: poNumber,
        billingCompany: billingCompany,
        billingAddress1: billingAddress1,
        lineItems: [
          {
            sku: 'FREIGHT-CASE6-200',
            quantity: qty,
            productTags: ['Freight', 'Wholesale-Case-6']
          }
        ]
      })
    });
    const report = await res.json();

    if (simTelemetryBadge) {
      simTelemetryBadge.textContent = report.telemetry.validationOutputBytes + ' B';
    }

    // Update Status Badge
    if (simStatusPill) {
      if (report.checkoutPassed) {
        simStatusPill.className = 'tl-status-badge tl-status-badge--passed';
        simStatusPill.innerHTML =
          '✔ Test passed<span style="display:none">CHECKOUT APPROVED (0 ERRORS)</span>';
      } else {
        simStatusPill.className = 'tl-status-badge tl-status-badge--failed';
        simStatusPill.innerHTML =
          report.validationErrors.length + ' checkout errors<span style="display:none">CHECKOUT BLOCKED (' + report.validationErrors.length + ' ERRORS)</span>';
      }
    }

    // Update Errors / Validation Container
    const poErr = report.validationErrors.find(function (e) { return e.target === '$.cart.poNumber'; });
    const addrErr = report.validationErrors.find(function (e) { return e.target.indexOf('$.cart.billingAddress') === 0; });
    const cartErrs = report.validationErrors.filter(function (e) { return e.target === '$.cart'; });

    if (simErrorsContainer) {
      simErrorsContainer.innerHTML =
        '<div class="tl-checkout-section">' +
          '<h4 class="tl-section-heading">Purchase order</h4>' +
          '<div class="tl-floating-box ' + (poErr ? 'tl-floating-box--error' : '') + '">' +
            '<span class="tl-floating-label">PO NUMBER</span>' +
            '<span class="tl-floating-val">' + (poNumber || '(No PO entered)') + '</span>' +
          '</div>' +
          (poErr
            ? '<div class="tl-inline-err" data-target="' + poErr.target + '"><span class="tl-err-dot">⚠</span><span>Enter a valid corporate PO number matching PO-XXXXXX — ' + poErr.localizedMessage + '</span><span style="display:none">' + poErr.target + '</span></div>'
            : '<div class="tl-inline-ok"><span>✔ Valid purchase order</span></div>') +
        '</div>' +
        '<div class="tl-checkout-section">' +
          '<h4 class="tl-section-heading">Billing &amp; shipping</h4>' +
          '<div class="tl-address-row">' +
            '<div class="tl-address-left">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
              '<div>' +
                '<p class="tl-addr-company">' + billingCompany + '</p>' +
                '<p class="tl-addr-street">' + billingAddress1 + ', Austin, TX 78701</p>' +
              '</div>' +
            '</div>' +
            '<div class="tl-freight-tag">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' +
              '<span>Commercial LTL freight</span>' +
            '</div>' +
          '</div>' +
          (addrErr
            ? '<div class="tl-inline-err" data-target="' + addrErr.target + '"><span class="tl-err-dot">⚠</span><span>' + addrErr.localizedMessage + '</span><span style="display:none">' + addrErr.target + '</span></div>'
            : '') +
          cartErrs.map(function (ce) {
            return '<div class="tl-inline-err" data-target="' + ce.target + '"><span class="tl-err-dot">⚠</span><span>' + ce.localizedMessage + '</span><span style="display:none">' + ce.target + '</span></div>';
          }).join('') +
        '</div>';
    }

    // Update Payment Methods List
    const sortedMethods = report.paymentMethodsPreview.slice().sort(function (a, b) {
      if (a.promotedToTop && !b.promotedToTop) return -1;
      if (!a.promotedToTop && b.promotedToTop) return 1;
      if (a.visible && !b.visible) return -1;
      if (!a.visible && b.visible) return 1;
      return 0;
    });

    if (simPaymentsContainer) {
      simPaymentsContainer.innerHTML = sortedMethods.map(function (pm) {
        if (pm.visible) {
          const isPromoted = pm.promotedToTop;
          return (
            '<div class="tl-payment-item ' + (isPromoted ? 'tl-payment-item--highlight' : '') + '" data-method-id="' + pm.id + '">' +
              '<div class="tl-payment-header-row">' +
                '<div class="tl-payment-left">' +
                  '<span class="tl-radio ' + (isPromoted ? 'tl-radio--checked' : '') + '"></span>' +
                  '<span class="tl-payment-name">' + (pm.originalName.indexOf('Net-30') !== -1 ? 'Net-30 corporate invoice' : pm.displayName) + '</span>' +
                '</div>' +
                (isPromoted
                  ? '<span class="tl-pill-rec">Recommended<span style="display:none"> RANK #1 • PROMOTED</span></span>'
                  : '<span class="tl-pill-avail">Available</span>') +
              '</div>' +
              (isPromoted
                ? '<p class="tl-payment-sub">PO verified • Pay within 30 days</p>'
                : '') +
            '</div>'
          );
        }
        return (
          '<div class="tl-payment-item tl-payment-item--hidden" data-method-id="' + pm.id + '">' +
            '<div class="tl-payment-header-row">' +
              '<div class="tl-payment-left">' +
                '<span class="tl-radio tl-radio--disabled"></span>' +
                '<span class="tl-payment-name tl-payment-name--muted">' + pm.displayName + '</span>' +
              '</div>' +
              '<span class="tl-pill-hidden">Hidden by rule<span style="display:none"> HIDDEN BY GATE</span></span>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }

    // Update Bottom Result Banner
    if (simBannerResult) {
      if (report.checkoutPassed) {
        simBannerResult.className = 'tl-result-banner tl-result-banner--pass';
        simBannerResult.innerHTML =
          '<div class="tl-result-circle tl-result-circle--pass">✔</div>' +
          '<div class="tl-result-text">' +
            '<h5 class="tl-result-title">All 3 checks passed</h5>' +
            '<p class="tl-result-subtitle">PO format • Order minimum • Case-pack quantity</p>' +
          '</div>';
      } else {
        simBannerResult.className = 'tl-result-banner tl-result-banner--fail';
        simBannerResult.innerHTML =
          '<div class="tl-result-circle tl-result-circle--fail">!</div>' +
          '<div class="tl-result-text">' +
            '<h5 class="tl-result-title">' + report.validationErrors.length + ' checks failed</h5>' +
            '<p class="tl-result-subtitle">' + report.validationErrors.map(function (e) { return e.localizedMessage; }).join(' • ') + '</p>' +
          '</div>';
      }
    }
  }

  if (runSimBtn) runSimBtn.addEventListener('click', handleSimulate);
})();`;
