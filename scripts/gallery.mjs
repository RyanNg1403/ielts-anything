// Screenshot the main screens in light and dark. Usage: node scripts/gallery.mjs <prefix> <chatId> <testId>
import { chromium } from "playwright-core";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [prefix, chat, test] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage();
  const shot = async (hash, name) => {
    await page.goto(`http://127.0.0.1:5173/${hash}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `.shots/${prefix}-${name}-${scheme}.png` });
  };
  await shot("#/", "home");
  await shot(`#/chat/${chat}`, "chat");
  await shot("#/tests", "tests");
  await shot(`#/test/${test}`, "results");
  await shot(`#/test/${test}/review?q=8`, "review");
  await ctx.close();
}
await browser.close();
console.log("ok");
