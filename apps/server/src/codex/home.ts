// The app runs Codex with its own CODEX_HOME so IELTS threads stay out of the learner's
// coding history, and their global AGENTS.md / memories do not leak into generated tests.
import { existsSync, lstatSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const APP_HOME = process.env.IELTS_HOME ?? join(homedir(), ".ielts-anything");
export const CODEX_HOME = join(APP_HOME, "codex");
export const WORKSPACE = join(APP_HOME, "workspace");
export const USER_CODEX_HOME = process.env.CODEX_HOME ?? join(homedir(), ".codex");

const CONFIG = `# Managed by ielts-anything. Edit model choices in the app's Settings instead.
[features]
memories = false
apps = false
plugins = false
goals = false
`;

/** Prepare the private Codex home. Reuses the learner's existing Codex login via a symlink. */
export function ensureCodexHome(): { loggedIn: boolean } {
  mkdirSync(CODEX_HOME, { recursive: true });
  mkdirSync(WORKSPACE, { recursive: true });
  const config = join(CODEX_HOME, "config.toml");
  if (!existsSync(config)) writeFileSync(config, CONFIG);

  const auth = join(CODEX_HOME, "auth.json");
  const userAuth = join(USER_CODEX_HOME, "auth.json");
  const present = existsSync(auth) || isSymlink(auth);
  if (!present && existsSync(userAuth)) symlinkSync(userAuth, auth);
  return { loggedIn: existsSync(auth) };
}

function isSymlink(path: string) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}
