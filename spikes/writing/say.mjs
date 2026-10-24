// Sends a message in an existing chat and waits for the tutor's turn to finish.
// Usage: node spikes/writing/say.mjs <chatId> "<message>"
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [chat, text] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
await page.goto(`http://127.0.0.1:5173/#/chat/${chat}`);
const box = page.getByPlaceholder("Reply, or type @ to bring in a test");
await box.waitFor();
await box.fill(text);
await page.keyboard.press("Enter");
await page.waitForTimeout(5000);
await page.waitForFunction(() => !document.body.innerText.includes("Working on it"), null, { timeout: 900_000, polling: 3000 });
await page.waitForFunction(() => !document.querySelector('textarea[placeholder="Working on it…"]'), null, { timeout: 900_000, polling: 3000 });
console.log((await page.locator("main").innerText()).slice(-700));
await browser.close();
