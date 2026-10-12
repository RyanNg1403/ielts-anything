// Asks the real tutor (Codex) for Writing tests through the app's home composer, one headless page
// per request, then screenshots each published test's task pages.
// Usage: node spikes/writing/gen.mjs "<request>" "<request>" ...
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const stamp = () => new Date().toLocaleTimeString();
const browser = await chromium.launch({ executablePath: CHROME });

await Promise.all(
  process.argv.slice(2).map(async (request, i) => {
    const tag = `r${i + 1}`;
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    page.on("pageerror", (e) => console.log(`${tag} pageerror ${e.message}`));
    await page.goto("http://127.0.0.1:5173/#/");
    await page.getByRole("textbox", { name: "What do you want to practise?" }).fill(request);
    await page.keyboard.press("Enter");
    await page.waitForURL(/#\/chat\//);
    const chat = page.url().split("#/chat/")[1];
    console.log(`${stamp()} ${tag} chat ${chat}: ${request}`);
    const card = page.locator("button", { hasText: "Writing ·" }).first();
    // Answer any clarifying form with its first option, so the run never waits on a person.
    for (let t = 0; t < 180 && !(await card.isVisible()); t++) {
      const option = page.locator('[role="radio"], [role="option"]').first();
      if (await option.isVisible().catch(() => false)) {
        console.log(`${stamp()} ${tag} answering a clarifying question`);
        await option.click();
        await page.getByRole("button", { name: /Send|Submit|Continue|Next/ }).first().click().catch(() => {});
      }
      await page.waitForTimeout(5000);
    }
    if (!(await card.isVisible())) {
      console.log(`${tag} no test card after 15 min. Chat shows:\n${(await page.locator("main").innerText()).slice(-1500)}`);
      return;
    }
    console.log(`${stamp()} ${tag} card: ${(await card.innerText()).replace(/\n+/g, " | ")}`);
    console.log(`${tag} chat text:\n${(await page.locator("main").innerText()).slice(-800)}`);
    await card.click();
    await page.waitForURL(/#\/test\//);
    const id = page.url().split("#/test/")[1];
    console.log(`${tag} test ${id}`);
    await page.waitForSelector("textarea");
    const tabs = await page.locator('nav[aria-label="Tasks"] button').count();
    for (let n = 0; n < Math.max(1, tabs); n++) {
      if (tabs) await page.locator('nav[aria-label="Tasks"] button').nth(n).click();
      const pane = page.locator(".overflow-y-auto").first();
      const h = await pane.evaluate((el) => el.scrollHeight);
      await page.setViewportSize({ width: 1400, height: Math.min(6000, h + 120) });
      await pane.screenshot({ path: `spikes/writing/out/${tag}-task${n + 1}.png` });
      await page.setViewportSize({ width: 1400, height: 1000 });
    }
    // Leave without writing, so the sitting stays untouched.
    await page.close();
  }),
);
await browser.close();
