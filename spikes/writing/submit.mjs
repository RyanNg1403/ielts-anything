// Takes a Writing test through the real UI: types an answer per task, submits, waits for the
// marking, and screenshots the results page. Usage: node spikes/writing/submit.mjs <testId> <answer-file-task1> [answer-file-task2]
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [id, ...files] = process.argv.slice(2);
const stamp = () => new Date().toLocaleTimeString();
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto(`http://127.0.0.1:5173/#/test/${id}`);
await page.waitForSelector("textarea");
for (const [i, file] of files.entries()) {
  if (files.length > 1) await page.locator('nav[aria-label="Tasks"] button').nth(i).click();
  await page.locator("textarea").fill(readFileSync(file, "utf8"));
  console.log(`${stamp()} typed task ${i + 1}: ${await page.locator("textarea + p, p:has-text('Words:')").first().innerText()}`);
}
await page.screenshot({ path: "spikes/writing/out/submit-sitting.png" });
await page.getByRole("button", { name: "Submit", exact: true }).first().click();
console.log(`${stamp()} dialog: ${(await page.getByRole("dialog").innerText()).replace(/\n+/g, " | ")}`);
await page.getByRole("dialog").getByRole("button", { name: "Submit" }).click();
await page.waitForSelector("text=Marking your writing", { timeout: 30_000 });
console.log(`${stamp()} marking screen shown`);
await page.waitForFunction(() => /Estimated band|Not marked/.test(document.body.innerText), null, { timeout: 900_000, polling: 3000 });
console.log(`${stamp()} result: ${(await page.locator("main").innerText()).slice(0, 400).replace(/\n+/g, " | ")}`);
const h = await page.evaluate(() => document.querySelector(".overflow-y-auto")?.scrollHeight ?? 2000);
await page.setViewportSize({ width: 1400, height: Math.min(8000, h) });
await page.screenshot({ path: "spikes/writing/out/submit-results.png", fullPage: true });
await browser.close();
