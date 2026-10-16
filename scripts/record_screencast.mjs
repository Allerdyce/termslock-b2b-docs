import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const STORE_DIR = path.join(ROOT_DIR, "docs", "shopify-store");
const TMP_VIDEO_DIR = path.join(STORE_DIR, "tmp-video");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordScreencast() {
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
  await sleep(1200);

  // STEP 1: Configure B2B PO Format rule (^PO-[0-9]{6}$, $1,000 threshold) & $500 Wholesale MOQ and click Save rules
  console.log("[Screencast] Step 1: Configuring corporate PO format & MOQ...");
  const corporateBtn = page.locator("#preset-po-corporate");
  if (await corporateBtn.isVisible()) {
    await corporateBtn.click();
    await sleep(400);
  }

  const thresholdInput = page.locator("#po-threshold-input");
  if (await thresholdInput.isVisible()) {
    await thresholdInput.fill("1000");
    await sleep(300);
  }

  const moqInput = page.locator("#moq-subtotal-input");
  if (await moqInput.isVisible()) {
    await moqInput.fill("500");
    await sleep(300);
  }

  const saveBtn = page.locator("#save-rules-btn");
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    console.log("[Screencast] Clicked Save rules.");
    await sleep(1500);
  }

  // STEP 2: Test Approved Net-30 Buyer (PO-849201) in Live Checkout Preview
  console.log("[Screencast] Step 2: Testing Approved Net-30 Buyer (PO-849201)...");
  const passBtn = page.locator("#preset-scenario-pass");
  if (await passBtn.isVisible()) {
    await passBtn.click();
    await sleep(2000);
  }

  // STEP 3: Test Blocked Buyer (INVALID-123 + P.O. Box 409)
  console.log("[Screencast] Step 3: Testing Blocked Buyer (INVALID-123 + P.O. Box 409)...");
  const failBtn = page.locator("#preset-scenario-fail");
  if (await failBtn.isVisible()) {
    await failBtn.click();
    await sleep(1500);
  }

  // Expand test buyer drawer to demonstrate custom buyer inputs
  const drawer = page.locator("#test-buyer-drawer summary");
  if (await drawer.isVisible()) {
    await drawer.click();
    await sleep(1200);
  }

  // Switch back to Approved Net-30 to leave on a winning state
  if (await passBtn.isVisible()) {
    await passBtn.click();
    await sleep(1500);
  }

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

  fs.copyFileSync(generatedVideoPath, destWebm);
  // Also create termslock-screencast.mp4 copy
  fs.copyFileSync(generatedVideoPath, destMp4);

  // Clean up tmp dir
  fs.rmSync(TMP_VIDEO_DIR, { recursive: true, force: true });

  const stat = fs.statSync(destWebm);
  console.log(`[Screencast] Successfully saved walkthrough video:`);
  console.log(`  -> ${destWebm} (${(stat.size / 1024).toFixed(1)} KB)`);
  console.log(`  -> ${destMp4} (${(stat.size / 1024).toFixed(1)} KB)`);
}

recordScreencast().catch((err) => {
  console.error("[Screencast] Error:", err);
  process.exit(1);
});
