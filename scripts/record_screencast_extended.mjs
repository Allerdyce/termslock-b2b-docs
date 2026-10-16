import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT_DIR = process.cwd();
const STORE_DIR = path.join(ROOT_DIR, "docs", "shopify-store");
const TMP_VIDEO_DIR = path.join(STORE_DIR, "tmp-video-extended");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function showBanner(page, stepNum, totalSteps, title, description) {
  await page.evaluate(({ stepNum, totalSteps, title, description }) => {
    let overlay = document.getElementById("screencast-caption-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "screencast-caption-overlay";
      overlay.style.position = "fixed";
      overlay.style.bottom = "24px";
      overlay.style.left = "50%";
      overlay.style.transform = "translateX(-50%)";
      overlay.style.zIndex = "999999";
      overlay.style.backgroundColor = "rgba(26, 26, 26, 0.94)";
      overlay.style.color = "#FFFFFF";
      overlay.style.padding = "14px 28px";
      overlay.style.borderRadius = "12px";
      overlay.style.boxShadow = "0 8px 32px rgba(0,0,0,0.35)";
      overlay.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      overlay.style.maxWidth = "800px";
      overlay.style.width = "90%";
      overlay.style.transition = "all 0.3s ease";
      overlay.style.border = "1px solid rgba(255,255,255,0.15)";
      overlay.style.backdropFilter = "blur(8px)";
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #008060; background: #E3F1DF; padding: 2px 8px; borderRadius: 4px;">Step ${stepNum} of ${totalSteps}</span>
        <span style="font-size: 12px; color: #999999;">TermsLock B2B Governance</span>
      </div>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 13px; color: #CCCCCC; line-height: 1.4;">${description}</div>
    `;
    overlay.style.opacity = "1";
  }, { stepNum, totalSteps, title, description });
  await sleep(600);
}

async function recordExtendedScreencast() {
  fs.mkdirSync(TMP_VIDEO_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: TMP_VIDEO_DIR,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  console.log("[Screencast] Navigating to http://localhost:3456/ ...");
  await page.goto("http://localhost:3456/", { waitUntil: "networkidle" });
  await sleep(1500);

  // SCENE 1: Introduction & App Overview
  await showBanner(
    page,
    1,
    6,
    "Welcome to TermsLock: B2B PO, Tax & Net-30 Governance",
    "TermsLock enforces strict B2B purchase order rules, Wholesale MOQs, and Net-30 payment method restrictions via deterministic Shopify Functions."
  );
  await sleep(6000);

  // SCENE 2: Merchant Configuration & Dynamic Rule Updates
  await showBanner(
    page,
    2,
    6,
    "Merchant Configuration: Setting PO Regex & Wholesale MOQ",
    "Selecting the Corporate PO preset (^PO-[0-9]{6}$), setting a $1,000 threshold, and enforcing a $500 Wholesale Minimum Order Quantity."
  );
  await sleep(2500);

  const corporateBtn = page.locator("#preset-po-corporate");
  if (await corporateBtn.isVisible()) {
    await corporateBtn.click();
    await sleep(2000);
  }

  const thresholdInput = page.locator("#po-threshold-input");
  if (await thresholdInput.isVisible()) {
    await thresholdInput.fill("1000");
    await sleep(2000);
  }

  const moqInput = page.locator("#moq-subtotal-input");
  if (await moqInput.isVisible()) {
    await moqInput.fill("500");
    await sleep(2000);
  }

  // Scroll smoothly to Payment Customization section
  await page.evaluate(() => window.scrollTo({ top: 280, behavior: "smooth" }));
  await sleep(2000);

  // Save rules to App Metafields
  const saveBtn = page.locator("#save-rules-btn");
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    console.log("[Screencast] Clicked Save rules.");
    await sleep(4000);
  }

  // SCENE 3: Scenario A - Approved B2B Wholesale Buyer Checkout
  await showBanner(
    page,
    3,
    6,
    "Customer Checkout Simulation: Approved Net-30 Buyer",
    "Testing a verified B2B wholesale customer with corporate PO (PO-849201), $1,450 cart subtotal, and b2b-net30 account tag."
  );
  await sleep(2500);

  await page.evaluate(() => window.scrollTo({ top: 320, behavior: "smooth" }));
  await sleep(1500);

  const passBtn = page.locator("#preset-scenario-pass");
  if (await passBtn.isVisible()) {
    await passBtn.click();
    await sleep(8000);
  }

  // SCENE 4: Scenario B - Blocked Invalid PO & Residential Address
  await showBanner(
    page,
    4,
    6,
    "Customer Checkout Simulation: Blocked Invalid Buyer",
    "Testing an unverified buyer submitting an invalid PO format (INVALID-123) and a restricted residential PO Box address (P.O. Box 409)."
  );
  await sleep(2500);

  const failBtn = page.locator("#preset-scenario-fail");
  if (await failBtn.isVisible()) {
    await failBtn.click();
    await sleep(8000);
  }

  // SCENE 5: Interactive Buyer Drawer & Wholesale MOQ Enforcement
  await showBanner(
    page,
    5,
    6,
    "Custom Buyer Drawer: Live Wholesale MOQ & Case-Pack Rules",
    "Opening the live test drawer to inspect custom cart payloads, subtotal validation, and freight case-pack constraints in real time."
  );
  await sleep(2000);

  const drawer = page.locator("#test-buyer-drawer summary");
  if (await drawer.isVisible()) {
    await drawer.click();
    await sleep(3000);
  }

  // Scroll down to see full drawer inputs
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "smooth" }));
  await sleep(4000);

  // Modify cart subtotal to $350 (below $500 MOQ) to demonstrate real-time block
  const simSubtotalInput = page.locator("#sim-subtotal");
  if (await simSubtotalInput.isVisible()) {
    await simSubtotalInput.fill("350");
    await sleep(1500);
    const runSimBtn = page.locator("#run-simulation-btn");
    if (await runSimBtn.isVisible()) {
      await runSimBtn.click();
      console.log("[Screencast] Ran custom simulation under MOQ.");
      await sleep(6000);
    }
  }

  // Restore winning state with valid $1,250 subtotal
  if (await simSubtotalInput.isVisible()) {
    await simSubtotalInput.fill("1250");
    await sleep(1500);
    const runSimBtn = page.locator("#run-simulation-btn");
    if (await runSimBtn.isVisible()) {
      await runSimBtn.click();
      await sleep(6000);
    }
  }

  // SCENE 6: Production Verification & Zero-Latency Execution
  await showBanner(
    page,
    6,
    6,
    "100% Deterministic Wasm Execution (Shopify Functions)",
    "Checkout rules execute inside Shopify's isolated Wasm sandbox under 5ms CPU budget with zero external network requests."
  );
  await sleep(2000);

  // Scroll back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(6000);

  console.log("[Screencast] Finalizing video recording...");
  await page.close();
  await context.close();
  await browser.close();

  // Find generated video file in tmp-video
  const files = fs.readdirSync(TMP_VIDEO_DIR).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) {
    throw new Error("No video file was generated in " + TMP_VIDEO_DIR);
  }

  const generatedVideoPath = path.join(TMP_VIDEO_DIR, files[0]);
  const destWebm = path.join(STORE_DIR, "termslock-screencast.webm");
  const destMp4 = path.join(STORE_DIR, "termslock-screencast.mp4");

  // Use ffmpeg to produce standard H.264 MP4 and WebM
  console.log("[Screencast] Encoding with ffmpeg into standard H.264 MP4...");
  try {
    execSync(
      `ffmpeg -y -i "${generatedVideoPath}" -c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.0 -movflags +faststart -r 30 "${destMp4}"`,
      { stdio: "inherit" }
    );
    console.log("[Screencast] MP4 encoded successfully.");
  } catch (e) {
    console.warn("[Screencast] ffmpeg MP4 encoding failed, falling back to copy:", e.message);
    fs.copyFileSync(generatedVideoPath, destMp4);
  }

  fs.copyFileSync(generatedVideoPath, destWebm);

  // Clean up tmp dir
  fs.rmSync(TMP_VIDEO_DIR, { recursive: true, force: true });

  const statMp4 = fs.statSync(destMp4);
  const statWebm = fs.statSync(destWebm);
  console.log(`[Screencast] Completed comprehensive walkthrough video:`);
  console.log(`  -> ${destMp4} (${(statMp4.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  -> ${destWebm} (${(statWebm.size / 1024 / 1024).toFixed(2)} MB)`);
}

recordExtendedScreencast().catch((err) => {
  console.error("[Screencast] Error:", err);
  process.exit(1);
});
