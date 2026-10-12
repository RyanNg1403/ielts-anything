// Screenshots each figure on #/dev/figures (light and dark) for a visual check.
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: CHROME });
for (const scheme of (process.argv[2] ?? "light").split(",")) {
  const page = await browser.newPage({ viewport: { width: Number(process.argv[3] ?? 800), height: 4000 }, deviceScaleFactor: 1.5, colorScheme: scheme });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto("http://127.0.0.1:5173/#/dev/figures");
  await page.waitForSelector("section");
  for (const s of await page.$$("section")) {
    const id = await s.getAttribute("id");
    await s.screenshot({ path: `spikes/figures/${id}-${scheme}${process.argv[3] ? `-${process.argv[3]}` : ""}.png` });
  }
}
await browser.close();
