// `npx ielts-anything`: checks the machine, starts the app on one port and opens it in the browser.
import { spawn, spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { VERSION } from "./paths.ts";

const HELP = `IELTS Anything ${VERSION}: IELTS practice on any topic, powered by your Codex subscription.

Usage: ielts-anything [options]

Options:
  -p, --port <port>  Port to serve the app on (default 8787, or $PORT)
      --no-open      Don't open the browser
  -v, --version      Print the version
  -h, --help         Show this help

Data is kept in ~/.ielts-anything (or $IELTS_HOME).`;

const { values } = parseArgs({
  options: {
    port: { type: "string", short: "p" },
    "no-open": { type: "boolean" },
    version: { type: "boolean", short: "v" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(HELP);
  process.exit(0);
}
if (values.version) {
  console.log(VERSION);
  process.exit(0);
}

const fail = (message: string) => {
  console.error(`\n  ${message}\n`);
  process.exit(1);
};

// node:sqlite, used for the app's database, needs no flag from Node 22.13.
const [major, minor] = process.versions.node.split(".").map(Number) as [number, number];
if (major < 22 || (major === 22 && minor < 13)) fail(`IELTS Anything needs Node.js 22.13 or newer (you have ${process.versions.node}).`);

if (spawnSync("codex", ["--version"], { stdio: "ignore" }).error)
  fail("The Codex CLI was not found. Install it (https://developers.openai.com/codex), run `codex login`, then try again.");

const port = values.port ?? process.env.PORT ?? "8787";
if (!/^\d+$/.test(port)) fail(`"${port}" is not a port number.`);
process.env.PORT = port;

await import("./main.ts");

const url = `http://127.0.0.1:${port}`;
for (let i = 0; i < 50; i++) {
  if (await fetch(`${url}/api/status`).then((r) => r.ok, () => false)) break;
  await new Promise((r) => setTimeout(r, 200));
}
console.log(`\n  IELTS Anything is running at ${url}\n  Press Ctrl+C to stop.\n`);

if (!values["no-open"]) {
  const [cmd, args] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => {}).unref();
}
