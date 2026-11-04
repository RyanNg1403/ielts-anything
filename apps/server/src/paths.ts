// Where the app's own files live: the repo root in development, the package root once installed
// from npm (the server is then bundled into dist/cli.js).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findRoot(from: string) {
  let dir = from;
  while (!existsSync(join(dir, "skills"))) {
    const up = dirname(dir);
    if (up === dir) throw new Error(`Could not find the skills folder above ${from}.`);
    dir = up;
  }
  return dir;
}

export const ROOT = findRoot(dirname(fileURLToPath(import.meta.url)));
export const SKILLS_DIR = join(ROOT, "skills");
/** The built web app, served by the server in the npm package. Absent in development (Vite serves it). */
export const WEB_DIR = join(ROOT, "dist", "web");
export const VERSION: string = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
