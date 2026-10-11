// Screenshot any route. Usage: node scripts/peek.mjs "<hash>" <name> [scrollSelector]
import { chromium } from "playwright-core";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [hash, name, click] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 1440), height: Number(process.env.H ?? 900) }, deviceScaleFactor: 2 });
await page.goto(`http://127.0.0.1:5173/${hash}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
if (click) { await page.getByRole("button", { name: click, exact: true }).first().click(); await page.waitForTimeout(800); }
await page.screenshot({ path: `.shots/${name}.png` });
console.log(`.shots/${name}.png`);
await browser.close();
