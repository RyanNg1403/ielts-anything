// Runs several Speaking tests at once against the real app, each in its own headless page with the
// learner simulator (apps/web/public/__probe/driver.js). Usage: node spikes/marker/batch.mjs <dir>=<testId> ...
import { createRequire } from "node:module";

const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const runs = process.argv.slice(2).map((a) => a.split("="));
const stamp = () => new Date().toLocaleTimeString();

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
});

await Promise.all(
  runs.map(async ([dir, id]) => {
    const page = await (await browser.newContext()).newPage();
    page.on("pageerror", (e) => console.log(`${dir} pageerror ${e.message}`));
    // The simulator must replace the microphone before the app asks for it.
    await page.addInitScript({ path: new URL("../../apps/web/public/__probe/driver.js", import.meta.url).pathname });
    await page.goto(`http://127.0.0.1:5173/#/test/${id}`);
    await page.evaluate((dir) => Object.assign(window.__probe, { dir, quiet: true }), dir);
    // The room enables Start once its microphone check has heard something.
    await page
      .waitForFunction(() => document.body.innerText.includes("Start the test"), null, { timeout: 30_000, polling: 500 })
      .catch(async (err) => {
        console.log(`${dir} page shows: ${(await page.evaluate(() => location.hash + " " + document.body.innerText)).slice(0, 300)}`);
        throw err;
      });
    await page.evaluate(() => window.__probe.play("hello"));
    await page.getByRole("button", { name: "Start the test" }).click({ timeout: 30_000 });
    console.log(`${stamp()} ${dir} started`);
    // Print the simulator's log as it grows, so a stuck run shows where it stopped.
    let shown = 0;
    const tail = setInterval(async () => {
      const log = await page.evaluate(() => window.__probe.log).catch(() => []);
      for (const l of log.slice(shown)) console.log(`${stamp()} ${dir} ${l}`);
      shown = log.length;
    }, 15_000);
    page.once("close", () => clearInterval(tail));
    await page.evaluate(() => window.__probe.run([]));
    console.log(`${stamp()} ${dir} test over`);
    // A stopped test offers to mark what was said; take it so the failure path is exercised too.
    const markIt = page.getByRole("button", { name: "Mark what I said" });
    if (await markIt.isVisible()) { await markIt.click(); await page.waitForTimeout(3000); }
    await page.waitForFunction(() => !document.body.innerText.includes("Marking your speaking"), null, { timeout: 600_000, polling: 1000 });
    console.log(`${stamp()} ${dir} marking done`);
    console.log(`${dir} page: ${(await page.evaluate(() => location.hash + " " + document.body.innerText)).slice(0, 400)}`);
    clearInterval(tail);
    console.log(`${dir} log:\n  ${(await page.evaluate(() => window.__probe.log)).join("\n  ")}`);
  }),
);
await browser.close();
