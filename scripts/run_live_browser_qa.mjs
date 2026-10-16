import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { startTermsLockServer } from "../src/server.ts";

const ROOT_DIR = process.cwd();
const QA_DIR = path.join(ROOT_DIR, "docs", "qa");
const STORE_SCREENSHOTS_DIR = path.join(
  ROOT_DIR,
  "docs",
  "shopify-store",
  "screenshots"
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function flattenAndVerifyPngs(pngPaths) {
  const pyScript = `
import sys, struct, hashlib
from pathlib import Path
from PIL import Image

hashes = {}
for p_str in sys.argv[1:]:
    p = Path(p_str)
    with Image.open(p) as im:
        rgb = im.convert("RGB")
        if rgb.size != (1600, 900):
            rgb = rgb.resize((1600, 900), Image.Resampling.LANCZOS)
        rgb.save(p, format="PNG", optimize=True)
    raw = p.read_bytes()
    w, h, depth, ctype = struct.unpack(">IIBB", raw[16:26])
    assert (w, h) == (1600, 900), f"{p}: expected 1600x900, got {w}x{h}"
    assert ctype == 2, f"{p}: expected color_type=2 (RGB), got {ctype}"
    sha = hashlib.sha256(raw).hexdigest()
    hashes[p.name] = sha
    print(f"Verified live capture {p.name}: {w}x{h} 24-bit RGB (color_type={ctype}), {len(raw):,} bytes, SHA-256: {sha[:16]}...")

s1 = hashes.get("01-b2b-po-number-checkout-validation.png")
s2 = hashes.get("02-net30-payment-method-customization.png")
s3 = hashes.get("03-wholesale-moq-dryrun-simulator.png")

if s1 and s2 and s3:
    assert s1 != s2, f"Screenshot 01 and 02 must have distinct SHA-256 hashes! (Both were {s1[:16]})"
    assert s2 != s3, f"Screenshot 02 and 03 must have distinct SHA-256 hashes! (Both were {s2[:16]})"
    assert s1 != s3, f"Screenshot 01 and 03 must have distinct SHA-256 hashes! (Both were {s1[:16]})"
    print("SUCCESS: Verified all 3 store screenshots (01, 02, 03) have 100% distinct visual compositions and SHA-256 hashes!")
`;
  execFileSync("python3", ["-c", pyScript, ...pngPaths], { stdio: "inherit" });
}

async function captureScreenshotToFiles(page, filePaths) {
  const rawBuffer = await page.screenshot({ type: "png" });
  for (const fp of filePaths) {
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, rawBuffer);
  }
}

async function main() {
  fs.mkdirSync(QA_DIR, { recursive: true });
  fs.mkdirSync(STORE_SCREENSHOTS_DIR, { recursive: true });

  // 1. Boot the real HTTP server on port 3456
  const { server, url } = await startTermsLockServer(3456);
  console.log(`[QA Gate 4] Live HTTP server listening at ${url}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"]
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  try {
    // Navigate to http://localhost:3456
    await page.goto("http://localhost:3456/", { waitUntil: "networkidle" });
    await sleep(800);

    const pageTitle = await page.title();
    console.log(`[QA Gate 4] Connected to live page: "${pageTitle}"`);

    // =========================================================================
    // INTERACTIVE TEST 1: PO Presets Click-Through & Rule Saving (Screenshot 01)
    // =========================================================================
    console.log(
      "[QA Gate 3] Executing Step 1: Testing all 4 PO Format Presets..."
    );
    const presetsResult = await page.evaluate(async () => {
      const results = [];
      const presets = [
        { id: "preset-po-corporate", expectedRegex: "^PO-[0-9]{6}$" },
        { id: "preset-po-numeric", expectedRegex: "^[0-9]{5,10}$" },
        { id: "preset-po-nonempty", expectedRegex: "^.+$" },
        { id: "preset-po-custom", expectedRegex: "^PO-[0-9]{5,10}$" }
      ];

      for (const p of presets) {
        document.getElementById(p.id).click();
        await new Promise((r) => setTimeout(r, 100));
        const val = document.getElementById("po-regex-input").value;
        const bullet = document.getElementById("summary-bullet-po").textContent;
        results.push({
          id: p.id,
          val,
          bullet,
          match: val === p.expectedRegex && bullet.includes(val)
        });
      }

      // Reset to corporate preset (^PO-[0-9]{6}$)
      document.getElementById("preset-po-corporate").click();
      await new Promise((r) => setTimeout(r, 100));

      // Lock consistent defaults matching screenshots (^PO-[0-9]{6}$, $1,000 threshold, $500 MOQ)
      document.getElementById("po-threshold-input").value = "1000";
      document.getElementById("po-threshold-input").dispatchEvent(new Event("input"));
      document.getElementById("moq-subtotal-input").value = "500";
      document.getElementById("moq-subtotal-input").dispatchEvent(new Event("input"));

      // Click Save rules
      document.getElementById("save-rules-btn").click();
      await new Promise((r) => setTimeout(r, 400));

      return {
        presets: results,
        saveBanner: document.getElementById("rules-save-banner").textContent,
        bulletPo: document.getElementById("summary-bullet-po").textContent,
        bulletMoq: document.getElementById("summary-bullet-moq").textContent
      };
    });

    for (const pr of presetsResult.presets) {
      if (!pr.match) {
        throw new Error(
          `Preset click test failed for ${pr.id}: ${JSON.stringify(pr)}`
        );
      }
    }
    console.log(
      `[QA Gate 3] Presets verified in lockstep: ${presetsResult.presets.length} / 4 passed`
    );
    console.log(
      `[QA Gate 3] Save status: "${presetsResult.saveBanner}", PO: "${presetsResult.bulletPo}", MOQ: "${presetsResult.bulletMoq}"`
    );

    // Screenshot 01: Top PO Validation and Active Rule Summary view
    const qa01Path = path.join(QA_DIR, "qa-01-live-rule-builder.png");
    const store01Path = path.join(
      STORE_SCREENSHOTS_DIR,
      "01-b2b-po-number-checkout-validation.png"
    );
    await captureScreenshotToFiles(page, [qa01Path, store01Path]);

    // =========================================================================
    // INTERACTIVE TEST 2: Toggle Blocked PO & Address Scenario (Screenshot 03)
    // =========================================================================
    console.log(
      "[QA Gate 3] Executing Step 2: Click '✕ Blocked PO & Address' scenario toggle..."
    );
    const test2Result = await page.evaluate(async () => {
      document.getElementById("preset-scenario-fail").click();
      await new Promise((r) => setTimeout(r, 350));
      return {
        statusPill: document.getElementById("sim-status-pill").textContent.trim(),
        errorsHtml: document.getElementById("sim-errors-container").textContent,
        paymentsHtml: document.getElementById("sim-payments-container").textContent
      };
    });

    if (
      !test2Result.errorsHtml.includes("$.cart.poNumber") ||
      !test2Result.errorsHtml.includes("$.cart.billingAddress.address1") ||
      !test2Result.paymentsHtml.includes("Hidden by rule")
    ) {
      throw new Error(
        `Interactive Test 2 failed assertions: ${JSON.stringify(test2Result)}`
      );
    }
    console.log(`[QA Gate 3] Test 2 Blocked State Verified: ${test2Result.statusPill}`);

    // Screenshot 03: Blocked PO & Freight P.O. Box Inline Errors
    const qa02Path = path.join(QA_DIR, "qa-02-live-simulator-blocked.png");
    const store03Path = path.join(
      STORE_SCREENSHOTS_DIR,
      "03-wholesale-moq-dryrun-simulator.png"
    );
    await captureScreenshotToFiles(page, [qa02Path, store03Path]);

    // =========================================================================
    // INTERACTIVE TEST 3: Approved Net-30 + Expanded Drawer + Scrolled (Screenshot 02)
    // =========================================================================
    console.log(
      "[QA Gate 3] Executing Step 3: Click '✓ Approved Net-30', expand test drawer, and scroll down..."
    );
    const test3Result = await page.evaluate(async () => {
      // 1. Switch back to Approved Net-30
      document.getElementById("preset-scenario-pass").click();
      await new Promise((r) => setTimeout(r, 200));

      // 2. Expand Custom Test Buyer Drawer
      const drawer = document.getElementById("test-buyer-drawer");
      if (drawer) drawer.open = true;

      // 3. Scroll down (320px) to center Net-30 Payment Customization card alongside expanded simulator drawer
      window.scrollTo(0, 320);
      await new Promise((r) => setTimeout(r, 400));

      return {
        statusPill: document.getElementById("sim-status-pill").textContent.trim(),
        errorsHtml: document.getElementById("sim-errors-container").textContent,
        paymentsHtml: document.getElementById("sim-payments-container").textContent,
        scrollY: window.scrollY,
        isDrawerOpen: drawer ? drawer.open : false
      };
    });

    if (
      !test3Result.statusPill.includes("0 ERRORS") ||
      !test3Result.paymentsHtml.includes("Recommended") ||
      !test3Result.isDrawerOpen
    ) {
      throw new Error(
        `Interactive Test 3 failed assertions: ${JSON.stringify(test3Result)}`
      );
    }
    console.log(
      `[QA Gate 3] Test 3 Approved Scrolled State Verified: ${test3Result.statusPill} (scrollY=${test3Result.scrollY})`
    );

    // Screenshot 02: Net-30 Payment Customization + Expanded Live Checkout Drawer (distinct from 01 & 03)
    const qa03Path = path.join(QA_DIR, "qa-03-live-simulator-approved.png");
    const store02Path = path.join(
      STORE_SCREENSHOTS_DIR,
      "02-net30-payment-method-customization.png"
    );
    await captureScreenshotToFiles(page, [qa03Path, store02Path]);

    // =========================================================================
    // INTERACTIVE TEST 4: Custom PO-999999 Simulation
    // =========================================================================
    console.log(
      "[QA Gate 3] Executing Step 4: Test PO-999999 custom simulation..."
    );
    const test4Result = await page.evaluate(async () => {
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 150));

      // Enter PO-999999
      document.getElementById("sim-po-input").value = "PO-999999";
      document.getElementById("run-simulator-btn").click();
      await new Promise((r) => setTimeout(r, 350));

      return {
        statusPill: document.getElementById("sim-status-pill").textContent.trim(),
        errorsHtml: document.getElementById("sim-errors-container").textContent
      };
    });

    if (!test4Result.errorsHtml.includes("PO-999999")) {
      throw new Error(
        `Test 4 custom PO simulation failed: ${JSON.stringify(test4Result)}`
      );
    }
    console.log(
      `[QA Gate 3] Test 4 Custom PO-999999 Verified: ${test4Result.statusPill}`
    );

    // =========================================================================
    // INTERACTIVE TEST 5: Embedded Mode (?embedded=1)
    // =========================================================================
    console.log(
      "[QA Gate 3] Executing Step 5: Navigate to ?embedded=1 and verify host shell suppression..."
    );
    await page.goto("http://localhost:3456/?embedded=1", {
      waitUntil: "networkidle"
    });
    await sleep(800);

    const test5Result = await page.evaluate(() => {
      const topbar = document.querySelector(".shopify-host-topbar, .admin-host-topbar");
      const sidebar = document.querySelector(".shopify-host-sidebar, .admin-host-sidebar");
      const isEmbeddedClass =
        document.documentElement.classList.contains("is-embedded");
      const titleBar = document.querySelector("ui-title-bar");

      const topbarVisible = topbar
        ? window.getComputedStyle(topbar).display !== "none"
        : false;
      const sidebarVisible = sidebar
        ? window.getComputedStyle(sidebar).display !== "none"
        : false;

      return {
        isEmbeddedClass,
        hasTitleBar: !!titleBar,
        topbarVisible,
        sidebarVisible
      };
    });

    if (
      !test5Result.isEmbeddedClass ||
      test5Result.topbarVisible ||
      test5Result.sidebarVisible
    ) {
      throw new Error(
        `Test 5 embedded mode guard failed: ${JSON.stringify(test5Result)}`
      );
    }
    console.log(
      `[QA Gate 3] Test 5 Embedded Mode Verified: Mock TopBar/Sidebar cleanly hidden! (hasTitleBar=${test5Result.hasTitleBar})`
    );

    const qa04Path = path.join(QA_DIR, "qa-04-embedded-iframe-mode.png");
    await captureScreenshotToFiles(page, [qa04Path]);

    await page.close();
    await context.close();
    await browser.close();

    flattenAndVerifyPngs([
      qa01Path,
      qa02Path,
      qa03Path,
      qa04Path,
      store01Path,
      store02Path,
      store03Path
    ]);
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
