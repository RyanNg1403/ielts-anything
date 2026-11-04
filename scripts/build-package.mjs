// Builds the npm package: the web app into dist/web, and the server (with @ielts/spec inlined)
// into dist/cli.js. Runtime dependencies stay external and are installed from package.json.
import { build } from "esbuild";
import { cpSync, readFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8"));

rmSync(`${root}dist`, { recursive: true, force: true });
execSync("npm run build -w @ielts/web", { cwd: root, stdio: "inherit" });
cpSync(`${root}apps/web/dist`, `${root}dist/web`, { recursive: true });

await build({
  entryPoints: [`${root}apps/server/src/cli.ts`],
  outfile: `${root}dist/cli.js`,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: Object.keys(pkg.dependencies),
  banner: { js: "#!/usr/bin/env node" },
  logLevel: "info",
});
