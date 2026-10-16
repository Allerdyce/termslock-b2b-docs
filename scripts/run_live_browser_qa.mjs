import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { startTermsLockServer } from "../src/server.ts";

const CHROME_BIN =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
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

async function getCdpWebSocketUrl(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      const pageTarget = targets.find((t) => t.type === "page");
      if (pageTarget && pageTarget.webSocketDebuggerUrl) {
        return pageTarget.webSocketDebuggerUrl;
      }
    } catch {
      // Wait for Chrome debugging server
    }
    await sleep(150);
  }
  throw new Error("Timed out waiting for Chrome DevTools WebSocket target");
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("error", (e) => reject(e));
    });
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(
        `Runtime.evaluate exception: ${JSON.stringify(res.exceptionDetails)}`
      );
    }
    return res.result?.value;
  }

  async captureScreenshotToFiles(filePaths) {
    const { data } = await this.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    const rawBuffer = Buffer.from(data, "base64");
    for (const fp of filePaths) {
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, rawBuffer);
    }
  }

  close() {
    this.ws?.close();
  }
}

function flattenAndVerifyPngs(pngPaths) {
  const pyScript = `
import sys, struct
from pathlib import Path
from PIL import Image

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
    print(f"Verified live capture {p.name}: {w}x{h} 24-bit RGB (color_type={ctype}), {len(raw):,} bytes")
`;
  execFileSync("python3", ["-c", pyScript, ...pngPaths], { stdio: "inherit" });
}

async function main() {
  fs.mkdirSync(QA_DIR, { recursive: true });
  fs.mkdirSync(STORE_SCREENSHOTS_DIR, { recursive: true });

  // 1. Boot the real HTTP server on port 3456
  const { server, url } = await startTermsLockServer(3456);
  console.log(`[QA Gate 4] Live HTTP server listening at ${url}`);

  const cdpPort = 9229;
  const userDataDir = fs.mkdtempSync("/tmp/termslock-chrome-cdp-");
  const chromeProc = spawn(
    CHROME_BIN,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      "--window-size=1600,900",
      "--force-device-scale-factor=1",
      "about:blank"
    ],
    { stdio: "ignore" }
  );

  try {
    const wsUrl = await getCdpWebSocketUrl(cdpPort);
    const cdp = new CdpClient(wsUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1600,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Navigate to http://localhost:3456
    await cdp.send("Page.navigate", { url: "http://localhost:3456/" });
    await sleep(1000);

    const pageTitle = await cdp.evaluate("document.title");
    console.log(`[QA Gate 4] Connected to live page: "${pageTitle}"`);

    // =========================================================================
    // INTERACTIVE TEST 1: Rule Editing & <10 KB Metafield Compilation
    // =========================================================================
    console.log(
      "[QA Gate 4] Executing Interactive Test 1: Set PO Regex to ^PO-[0-9]{6}$ and click Save & Compile Rules..."
    );
    const test1Result = await cdp.evaluate(`
      (async () => {
        const input = document.getElementById('po-regex-input');
        input.value = '^PO-[0-9]{6}$';
        document.getElementById('save-rules-btn').click();
        await new Promise(r => setTimeout(r, 350));
        return {
          banner: document.getElementById('rules-save-banner').textContent,
          counter: document.getElementById('metafield-byte-counter').textContent,
          json: document.getElementById('metafield-json-preview').textContent
        };
      })()
    `);

    if (!test1Result.json.includes('"^PO-[0-9]{6}$"')) {
      throw new Error(
        `Interactive Test 1 failed: Metafield JSON did not update: ${JSON.stringify(test1Result)}`
      );
    }
    console.log(`[QA Gate 4] Test 1 Metafield Counter: ${test1Result.counter}`);

    const qa01Path = path.join(QA_DIR, "qa-01-live-rule-builder.png");
    const store01Path = path.join(
      STORE_SCREENSHOTS_DIR,
      "01-b2b-po-number-checkout-validation.png"
    );
    await cdp.captureScreenshotToFiles([qa01Path, store01Path]);

    // =========================================================================
    // INTERACTIVE TEST 2: Live Dry-Run Failure Case (INVALID-123 + P.O. Box 409 + untagged)
    // =========================================================================
    console.log(
      "[QA Gate 4] Executing Interactive Test 2: PO 'INVALID-123', Address 'P.O. Box 409', Untagged customer..."
    );
    const test2Result = await cdp.evaluate(`
      (async () => {
        document.getElementById('sim-po-input').value = 'INVALID-123';
        document.getElementById('sim-address1-input').value = 'P.O. Box 409';
        document.getElementById('sim-tags-input').value = '';
        document.getElementById('run-simulator-btn').click();
        await new Promise(r => setTimeout(r, 350));
        return {
          statusPill: document.getElementById('sim-status-pill').textContent.trim(),
          errorsHtml: document.getElementById('sim-errors-container').textContent,
          paymentsHtml: document.getElementById('sim-payments-container').textContent
        };
      })()
    `);

    if (
      !test2Result.errorsHtml.includes("$.cart.poNumber") ||
      !test2Result.errorsHtml.includes("$.cart.billingAddress.address1") ||
      !test2Result.paymentsHtml.includes("HIDDEN BY GATE")
    ) {
      throw new Error(
        `Interactive Test 2 failed assertions: ${JSON.stringify(test2Result)}`
      );
    }
    console.log(`[QA Gate 4] Test 2 Status: ${test2Result.statusPill}`);

    const qa02Path = path.join(QA_DIR, "qa-02-live-simulator-blocked.png");
    const store03Path = path.join(
      STORE_SCREENSHOTS_DIR,
      "03-wholesale-moq-dryrun-simulator.png"
    );
    await cdp.captureScreenshotToFiles([qa02Path, store03Path]);

    // =========================================================================
    // INTERACTIVE TEST 3: Live Dry-Run Pass Case (PO-849201 + 400 Market St + Net-30)
    // =========================================================================
    console.log(
      "[QA Gate 4] Executing Interactive Test 3: PO 'PO-849201', Address '400 Market St', Tag 'Net-30'..."
    );
    const test3Result = await cdp.evaluate(`
      (async () => {
        document.getElementById('sim-po-input').value = 'PO-849201';
        document.getElementById('sim-address1-input').value = '400 Market St';
        document.getElementById('sim-tags-input').value = 'Net-30';
        document.getElementById('run-simulator-btn').click();
        await new Promise(r => setTimeout(r, 350));
        return {
          statusPill: document.getElementById('sim-status-pill').textContent.trim(),
          errorsHtml: document.getElementById('sim-errors-container').textContent,
          paymentsHtml: document.getElementById('sim-payments-container').textContent
        };
      })()
    `);

    if (
      !test3Result.statusPill.includes("CHECKOUT APPROVED (0 ERRORS)") ||
      !test3Result.paymentsHtml.includes("RANK #1 • PROMOTED")
    ) {
      throw new Error(
        `Interactive Test 3 failed assertions: ${JSON.stringify(test3Result)}`
      );
    }
    console.log(`[QA Gate 4] Test 3 Status: ${test3Result.statusPill}`);

    const qa03Path = path.join(QA_DIR, "qa-03-live-simulator-approved.png");
    const store02Path = path.join(
      STORE_SCREENSHOTS_DIR,
      "02-net30-payment-method-customization.png"
    );
    await cdp.captureScreenshotToFiles([qa03Path, store02Path]);

    cdp.close();

    flattenAndVerifyPngs([
      qa01Path,
      qa02Path,
      qa03Path,
      store01Path,
      store02Path,
      store03Path
    ]);
  } finally {
    chromeProc.kill("SIGKILL");
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
