// Task 1 maps and process diagrams are drawn by the tutor with Codex image generation. The app keeps
// each image the tutor generates in a chat until writing_publish attaches it to a figure.
import { copyFileSync, cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { APP_HOME, WORKSPACE } from "../codex/home.ts";

export const FIGURES_DIR = join(APP_HOME, "figures");
mkdirSync(FIGURES_DIR, { recursive: true });

/** Cambridge figures the tutor studies for style before drawing. Local copies only (copyrighted). */
const REFS_SOURCE = fileURLToPath(new URL("../../../../corpus/derived/figure-refs", import.meta.url));
export const REFS_DIR = join(WORKSPACE, "references");
export function installReferences() {
  if (existsSync(REFS_SOURCE)) cpSync(REFS_SOURCE, REFS_DIR, { recursive: true });
  return existsSync(REFS_DIR);
}

const generated = new Map<string, string[]>();

/** Keep an image the tutor generated in this chat. */
export function keepGenerated(conversationId: string, item: { result?: string; savedPath?: string; status?: string }) {
  const id = randomUUID();
  const file = figurePath(id);
  if (item.savedPath && existsSync(item.savedPath)) copyFileSync(item.savedPath, file);
  else if (item.result) writeFileSync(file, Buffer.from(item.result.replace(/^data:image\/\w+;base64,/, ""), "base64"));
  else return null;
  const list = generated.get(conversationId) ?? [];
  list.push(id);
  generated.set(conversationId, list);
  return id;
}

/** The most recent image generated in this chat and not yet attached to a figure. */
export function latestGenerated(conversationId: string) {
  return generated.get(conversationId)?.at(-1) ?? null;
}

export function markUsed(conversationId: string, id: string) {
  generated.set(conversationId, (generated.get(conversationId) ?? []).filter((x) => x !== id));
}

export function figurePath(id: string) {
  return join(FIGURES_DIR, `${id.replace(/[^a-z0-9-]/gi, "")}.png`);
}
