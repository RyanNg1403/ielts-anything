// Drives every way of starting a test and records where each one lands.
import { chromium } from "playwright-core";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [chatId, testId, search] = process.argv.slice(2);
const BASE = "http://127.0.0.1:5173/";
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const results = [];
const onTest = (id) => page.waitForURL((u) => u.hash.startsWith(`#/test/${id}`), { timeout: 180000 });
async function check(name, fn, id = testId) {
  const t0 = Date.now();
  try {
    await fn();
    await onTest(id);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `.shots/start-${results.length + 1}-${name}.png` });
    results.push(`PASS ${name} -> ${new URL(page.url()).hash} (${Math.round((Date.now() - t0) / 1000)}s)`);
  } catch (e) {
    await page.screenshot({ path: `.shots/start-${results.length + 1}-${name}-FAIL.png` });
    results.push(`FAIL ${name}: ${e.message.split("\n")[0]}`);
  }
}
async function home(hash) {
  await page.goto(BASE + hash, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
}

// 1. Card in chat
await check("card-click", async () => {
  await home(`#/chat/${chatId}`);
  await page.locator(`a[href^="#/test/${testId}"], button`).filter({ hasText: search }).last().click();
});
// Exit should go back to the chat
await page.getByRole("button", { name: /exit|back/i }).first().click().catch(() => {});
await page.waitForTimeout(800);
results.push(`exit -> ${new URL(page.url()).hash}`);

// 2. Tests page
await check("tests-page", async () => {
  await home("#/tests");
  await page.getByRole("button").filter({ hasText: search }).first().click();
});

// 3. Search palette
await check("search-cmdk", async () => {
  await home("#/");
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(300);
  await page.keyboard.type(search);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `.shots/start-search-palette.png` });
  await page.keyboard.press("Enter");
});

// 4. Ask the tutor in the test's own chat
await check("ask-in-chat", async () => {
  await home(`#/chat/${chatId}`);
  await page.getByRole("textbox").last().click();
  await page.keyboard.type("Let's take the test now.");
  await page.keyboard.press("Enter");
});

// 5. @-mention from a new chat
let newChat = "";
await check("mention-new-chat", async () => {
  await home("#/");
  await page.getByLabel("What do you want to practise?").click();
  await page.keyboard.type(`@${search}`);
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");
  await page.keyboard.type(" start it now");
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => u.hash.startsWith("#/chat/"), { timeout: 20000 });
  newChat = new URL(page.url()).hash.split("/")[2];
});
console.log(results.join("\n"));
console.log(`newChat ${newChat}`);
await browser.close();
