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

/**
 * Perform a silky-smooth, fluid ease-in-out scroll in the page
 * captured frame-by-frame by Playwright's video recorder.
 */
async function smoothScrollTo(page, targetY, durationMs = 1400) {
  await page.evaluate(async ({ targetY, durationMs }) => {
    const startY = window.scrollY;
    const diff = targetY - startY;
    const startTime = performance.now();
    return new Promise((resolve) => {
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        // quadratic ease-in-out
        const ease =
          progress < 0.5
            ? 2 * progress * progress
            : -1 + (4 - 2 * progress) * progress;
        window.scrollTo(0, startY + diff * ease);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          window.scrollTo(0, targetY);
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }, { targetY, durationMs });
  await sleep(400);
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
  await sleep(2500);

  // PHASE 1: Top Dashboard View (PO Validation configuration)
  console.log("[Screencast] Phase 1: Configuring PO rules at scroll top...");
  const corporateBtn = page.locator("#preset-po-corporate");
  if (await corporateBtn.isVisible()) {
    await corporateBtn.click();
    await sleep(1500);
  }

  const thresholdInput = page.locator("#po-threshold-input");
  if (await thresholdInput.isVisible()) {
    await thresholdInput.fill("1000");
    await sleep(1500);
  }

  const saveBtn = page.locator("#save-rules-btn");
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    console.log("[Screencast] Clicked Save rules.");
    await sleep(3000);
  }

  // PHASE 2: Smooth scroll down to Wholesale MOQ & Payment Customization
  console.log("[Screencast] Phase 2: Smooth scrolling down to Wholesale & Freight Protection...");
  await smoothScrollTo(page, 240, 1600);
  await sleep(2500);

  const moqInput = page.locator("#moq-subtotal-input");
  if (await moqInput.isVisible()) {
    await moqInput.fill("500");
    await sleep(2000);
  }

  // PHASE 3: Smooth scroll to center Checkout Preview perfectly on screen
  console.log("[Screencast] Phase 3: Smooth scrolling to center Checkout Preview card...");
  await smoothScrollTo(page, 440, 1600);
  await sleep(2000);

  // Test Approved Net-30 Scenario
  console.log("[Screencast] Testing Approved Net-30 Scenario...");
  const passBtn = page.locator("#preset-scenario-pass");
  if (await passBtn.isVisible()) {
    await passBtn.click();
    await sleep(4000);
  }

  // Test Blocked PO & Address Scenario
  console.log("[Screencast] Testing Blocked PO & Address Scenario...");
  const failBtn = page.locator("#preset-scenario-fail");
  if (await failBtn.isVisible()) {
    await failBtn.click();
    await sleep(4000);
  }

  // Toggle back to Approved Net-30 smoothly
  console.log("[Screencast] Switching back to Approved Net-30...");
  if (await passBtn.isVisible()) {
    await passBtn.click();
    await sleep(3000);
  }

  // PHASE 4: Smooth scroll down to Customize Test Buyer Inputs Drawer
  console.log("[Screencast] Phase 4: Smooth scrolling to Test Buyer Drawer...");
  await smoothScrollTo(page, 620, 1600);
  await sleep(2000);

  const drawerSummary = page.locator("#test-buyer-drawer summary");
  if (await drawerSummary.isVisible()) {
    await drawerSummary.click();
    console.log("[Screencast] Expanded custom test buyer inputs drawer.");
    await sleep(2500);
  }

  // Smooth scroll a bit further so drawer inputs are fully in view
  await smoothScrollTo(page, 720, 1400);
  await sleep(2000);

  // Change subtotal to $350 (below $500 MOQ)
  const simSubtotal = page.locator("#sim-subtotal");
  if (await simSubtotal.isVisible()) {
    await simSubtotal.fill("350");
    await sleep(1500);
    const runSimBtn = page.locator("#run-simulation-btn");
    if (await runSimBtn.isVisible()) {
      await runSimBtn.click();
      console.log("[Screencast] Ran custom simulation under MOQ ($350).");
      await sleep(4000);
    }
  }

  // Restore subtotal to $1,450 (passing)
  if (await simSubtotal.isVisible()) {
    await simSubtotal.fill("1450");
    await sleep(1500);
    const runSimBtn = page.locator("#run-simulation-btn");
    if (await runSimBtn.isVisible()) {
      await runSimBtn.click();
      console.log("[Screencast] Restored valid subtotal ($1,450).");
      await sleep(4000);
    }
  }

  // PHASE 5: Smooth scroll all the way back to top
  console.log("[Screencast] Phase 5: Smooth scrolling back to dashboard top...");
  await smoothScrollTo(page, 0, 2000);
  await sleep(4000);

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
