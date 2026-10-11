// Walk the main Reading flow and save numbered screenshots to .shots/.
// Usage: node scripts/tour.mjs <testId> <conversationId>
import { chromium } from "playwright-core";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const BASE = process.env.APP_URL ?? "http://localhost:5173/";
const [testId, convId] = process.argv.slice(2);
const answers = JSON.parse(process.env.ANSWERS ?? "{}");

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
page.on("console", (m) => m.type() === "error" && !m.text().includes("404") && console.error("[console]", m.text()));
let n = 0;
const shot = async (name) => {
  await page.waitForTimeout(600);
  const file = `.shots/m1-${String(++n).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: file });
  console.log(file);
};
const open = async (hash) => {
  await page.goto(`${BASE}${hash}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
};

await open("#/");
await shot("home");
await open(`#/chat/${convId}`);
await page.waitForTimeout(1500);
await shot("chat-with-test-card");

await page.getByRole("button", { name: /Start test|Continue test/ }).first().click();
await page.waitForTimeout(1500);
await shot("test-start");

// Highlight a phrase in the passage by selecting it.
await page.evaluate(() => {
  const span = document.querySelector("[data-para='1']");
  const node = span?.firstChild?.firstChild;
  if (!node) return;
  const r = document.createRange();
  r.setStart(node, 0);
  r.setEnd(node, 60);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
  span.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
});

for (const [q, a] of Object.entries(answers)) {
  const sel = page.getByLabel(`Answer to question ${q}`, { exact: true });
  if ((await sel.evaluate((el) => el.tagName)) === "SELECT") await sel.selectOption(a);
  else await sel.fill(a);
}
await page.getByRole("button", { name: "Question 5", exact: true }).click();
await shot("test-answering");

await page.getByRole("button", { name: "Submit" }).first().click();
await shot("submit-dialog");
await page.getByRole("dialog").getByRole("button", { name: "Submit" }).click();
await page.getByRole("button", { name: "Review answers" }).waitFor();
await page.evaluate(() => document.fonts.ready);
await shot("results");

await page.getByRole("button", { name: "Review answers" }).click();
await page.waitForTimeout(1500);
await shot("review");

await open(`#/chat/${convId}`);
await page.waitForTimeout(2000);
await shot("chat-with-score-card");
await open("#/tests");
await shot("tests-page");
await open("#/progress");
await shot("progress-page");
await page.keyboard.press("Meta+k");
await page.keyboard.type("gov");
await shot("search");
await browser.close();
