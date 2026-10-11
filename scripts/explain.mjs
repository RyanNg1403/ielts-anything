// Click a button inside a chat and wait for the tutor's turn to finish, then screenshot.
// Usage: node scripts/explain.mjs <conversationId> "<button name>" <shot-name>
import { chromium } from "playwright-core";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [conv, button, name] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:5173/#/chat/${conv}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: button }).last().click();
const t0 = Date.now();
await page.getByRole("button", { name: "Stop" }).waitFor({ timeout: 20000 });
await page.getByRole("button", { name: "Send" }).waitFor({ timeout: 600000 });
console.log(`turn took ${Math.round((Date.now() - t0) / 1000)}s`);
await page.waitForTimeout(1500);
await page.screenshot({ path: `.shots/${name}.png` });
// Also capture the top of the explanation card.
const card = page.locator("article").last();
await card.scrollIntoViewIfNeeded();
await card.evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.waitForTimeout(500);
await page.screenshot({ path: `.shots/${name}-top.png` });
await browser.close();
