// Screenshots the task pane of existing Writing tests. Usage: node spikes/writing/shot.mjs <name>=<testId> ...
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: CHROME });
for (const [name, id] of process.argv.slice(2).map((a) => a.split("="))) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 3000 } });
  await page.goto(`http://127.0.0.1:5173/#/test/${id}`);
  await page.waitForSelector("textarea");
  await page.locator(".overflow-y-auto").first().screenshot({ path: `spikes/writing/out/${name}.png` });
  // Opening a test starts a local draft; drop it so the sitting stays untouched.
  await page.evaluate((id) => localStorage.removeItem(`writing:${id}`), id);
  await page.close();
}
await browser.close();
