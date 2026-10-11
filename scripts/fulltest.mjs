// Create a full Reading test from the home composer and wait for the test card.
import { chromium } from "playwright-core";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const topic = process.argv[2];
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto("http://127.0.0.1:5173/#/", { waitUntil: "networkidle" });
await page.getByLabel("What would you like to read about?").fill(topic);
await page.getByRole("button", { name: "Create practice" }).click();
const t0 = Date.now();
const log = (m) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${m}`);
let shots = 0;
while (Date.now() - t0 < 40 * 60_000) {
  if (await page.getByRole("button", { name: "Continue" }).isVisible().catch(() => false)) {
    await page.screenshot({ path: ".shots/m1-20-full-ask.png" });
    for (const g of await page.locator("fieldset").all()) await g.locator("button").first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    log("answered questions");
  }
  if (await page.getByRole("button", { name: "Start test" }).isVisible().catch(() => false)) break;
  if (await page.getByRole("button", { name: "Send" }).isVisible().catch(() => false)) { log("turn ended without a test"); break; }
  const act = await page.locator("[aria-live=polite]").textContent().catch(() => null);
  if (act) log(act);
  if (++shots % 6 === 0) await page.screenshot({ path: ".shots/m1-21-full-generating.png" });
  await page.waitForTimeout(20000);
}
log("done");
await page.waitForTimeout(1500);
await page.screenshot({ path: ".shots/m1-22-full-ready.png" });
console.log("url", page.url());
await browser.close();
