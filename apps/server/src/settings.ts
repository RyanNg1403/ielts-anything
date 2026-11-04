// App settings kept on this computer only. The OpenAI key is stored in the app home with
// owner-only permissions and never sent to the browser.
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { APP_HOME } from "./codex/home.ts";

const FILE = join(APP_HOME, "settings.json");

export const VOICE_PROVIDERS = ["kokoro", "openai"] as const;
export type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

const settingsSchema = z.object({
  listeningVoices: z.enum(VOICE_PROVIDERS).default("kokoro"),
  openaiKey: z.string().nullable().default(null),
});
export type Settings = z.infer<typeof settingsSchema>;

export function getSettings(): Settings {
  try {
    if (existsSync(FILE)) return settingsSchema.parse(JSON.parse(readFileSync(FILE, "utf8")));
  } catch (err) {
    console.error("settings.json is unreadable; using defaults:", (err as Error).message);
  }
  return settingsSchema.parse({});
}

export function saveSettings(next: Settings) {
  writeFileSync(FILE, JSON.stringify(next, null, 2), { mode: 0o600 });
  chmodSync(FILE, 0o600);
}

/** What the browser may see: never the key itself. */
export function publicSettings(s = getSettings()) {
  return { listeningVoices: s.listeningVoices, openaiKeySet: !!s.openaiKey, openaiKeyHint: s.openaiKey ? `${s.openaiKey.slice(0, 3)}…${s.openaiKey.slice(-4)}` : null };
}

/** A key OpenAI accepts, checked with a free models request. Returns an error message, or null. */
export async function checkOpenAIKey(key: string): Promise<string | null> {
  try {
    const r = await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
    if (r.ok) return null;
    if (r.status === 401) return "OpenAI rejected that key. Check it and try again.";
    return `OpenAI could not check the key (status ${r.status}).`;
  } catch {
    return "Could not reach OpenAI to check the key. Check your internet connection.";
  }
}
