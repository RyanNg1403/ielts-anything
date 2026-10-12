// Screenshots a submitted Writing test's results page. Usage: node spikes/writing/results-shot.mjs <testId> <name>
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [id, name] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
await page.goto(`http://127.0.0.1:5173/#/test/${id}`);
await page.waitForFunction(() => /Estimated band|Not marked/.test(document.body.innerText), null, { timeout: 60_000 });
const h = await page.evaluate(() => document.querySelector(".overflow-y-auto")?.scrollHeight ?? 2000);
await page.setViewportSize({ width: 1100, height: Math.min(9000, h) });
await page.screenshot({ path: `spikes/writing/out/${name}.png` });
await browser.close();
