// Drive the web app in Chromium for screenshots and flows.
// Usage: node scripts/ui.mjs home | flow "<topic>"   (screenshots land in .shots/)
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const URL = process.env.APP_URL ?? "http://localhost:5173/";
const [cmd = "home", arg] = process.argv.slice(2);
const width = Number(process.env.W ?? 1440), height = Number(process.env.H ?? 900);

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
page.on("console", (m) => m.type() === "error" && console.error("[console]", m.text()));
await page.goto(URL, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const shot = (name) => page.screenshot({ path: `.shots/${name}.png` }).then(() => console.log(`.shots/${name}.png`));

if (cmd === "home") {
  await shot(`home-${width}`);
} else if (cmd === "open") {
  await page.getByRole("button", { name: arg }).first().click();
  await page.waitForTimeout(2500);
  await shot(`open-${width}`);
} else if (cmd === "reply") {
  // reply "<conversation title>" "<message>": answer any question cards with the first option
  await page.getByRole("button", { name: arg }).first().click();
  await page.getByLabel("Message").fill(process.argv[4]);
  await page.getByRole("button", { name: "Send" }).click();
  for (let round = 0; round < 3; round++) {
    const asked = await page.getByRole("button", { name: "Continue" }).waitFor({ timeout: 240000 }).then(() => true, () => false);
    if (!asked) break;
    await shot(`reply-ask-${round}`);
    for (const g of await page.locator("fieldset").all()) await g.locator("button").first().click();
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.getByRole("button", { name: "Send" }).waitFor({ timeout: 300000 });
  await page.waitForTimeout(1000);
  await shot("reply-done");
  await page.screenshot({ path: ".shots/reply-done-full.png", fullPage: true });
} else if (cmd === "flow") {
  await page.getByLabel("What would you like to read about?").fill(arg ?? "How frontier AI labs are governed");
  await page.getByRole("button", { name: "Create practice" }).click();
  const asked = await page.getByRole("button", { name: "Continue" }).waitFor({ timeout: 180000 }).then(() => true, () => false);
  await shot("flow-1-ask");
  if (!asked) { await browser.close(); process.exit(0); }
  const groups = await page.locator("fieldset").all();
  for (const g of groups) await g.locator("button").first().click();
  await shot("flow-2-picked");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForFunction(() => !document.querySelector("[aria-live]") && !document.querySelector('button:has-text("Stop")'), null, { timeout: 300000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await shot("flow-3-after");
  await page.screenshot({ path: ".shots/flow-3-full.png", fullPage: true });
}
await browser.close();
