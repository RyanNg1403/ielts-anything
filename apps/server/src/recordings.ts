// Speaking interview audio, one file per attempt, saved next to the database.
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_HOME } from "./codex/home.ts";

const DIR = join(APP_HOME, "recordings");
const TYPES = { webm: "audio/webm", m4a: "audio/mp4", ogg: "audio/ogg" } as const;
type Ext = keyof typeof TYPES;

const isAttemptId = (id: string) => /^[0-9a-f-]{36}$/.test(id);

/** The file extension for an uploaded content type, or null if the type is not accepted. */
export const recordingExt = (type: string) => ((Object.entries(TYPES).find(([, t]) => type.startsWith(t))?.[0] ?? null) as Ext | null);

export function recordingFile(attemptId: string) {
  if (!isAttemptId(attemptId)) return null;
  for (const ext of Object.keys(TYPES) as Ext[]) {
    const path = join(DIR, `${attemptId}.${ext}`);
    if (existsSync(path)) return { path, type: TYPES[ext] };
  }
  return null;
}

export function saveRecording(attemptId: string, ext: Ext, audio: Buffer) {
  if (!isAttemptId(attemptId)) throw new Error("Bad attempt id.");
  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, `${attemptId}.${ext}`), audio);
}

export function deleteRecording(attemptId: string) {
  const file = recordingFile(attemptId);
  if (file) rmSync(file.path, { force: true });
}
