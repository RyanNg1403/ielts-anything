// Listening recordings: rendered in the background after a test is published, one WAV per part,
// with cues (who speaks when) for the transcript and for jumping to answers in review.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { narratePart, type ListeningTest } from "@ielts/spec";
import { APP_HOME } from "../codex/home.ts";
import { getSettings, type VoiceProvider } from "../settings.ts";
import { castVoices } from "./voices.ts";
import { concat, encodeWav, kokoroEngine, openaiEngine, SAMPLE_RATE, silence, type Engine } from "./tts.ts";

export const AUDIO_DIR = join(APP_HOME, "audio");

export type Cue = { start: number; end: number; who: string; text: string; section?: number; index?: number };
type Manifest = { specHash: string; provider: VoiceProvider; parts: { duration: number; cues: Cue[] }[] };
type Job = { status: "rendering"; done: number; total: number; stage: string } | { status: "failed"; error: string };

export type AudioStatus =
  | { status: "ready"; provider: VoiceProvider; parts: { duration: number; cues: Cue[] }[] }
  | { status: "rendering"; progress: number; stage: string }
  | { status: "failed"; error: string };

const jobs = new Map<string, Job>();
let queue: Promise<void> = Promise.resolve();

/** Only what is spoken counts: an edited title or explanation keeps the recording. */
function specHash(test: ListeningTest) {
  const spoken = { mode: test.mode, parts: test.parts.map((p) => ({ number: p.number, context: p.context, speakers: p.speakers, sections: p.sections })) };
  return createHash("sha256").update(JSON.stringify(spoken)).digest("hex").slice(0, 16);
}

const dir = (testId: string) => join(AUDIO_DIR, testId.replace(/[^a-z0-9-]/gi, ""));
export const partFile = (testId: string, part: number) => join(dir(testId), `part-${part}.wav`);

function readManifest(testId: string): Manifest | null {
  try {
    return JSON.parse(readFileSync(join(dir(testId), "manifest.json"), "utf8"));
  } catch {
    return null;
  }
}

export function audioStatus(testId: string, test: ListeningTest): AudioStatus {
  const m = readManifest(testId);
  if (m && m.specHash === specHash(test) && m.parts.every((_, i) => existsSync(partFile(testId, i + 1)))) return { status: "ready", provider: m.provider, parts: m.parts };
  const job = jobs.get(testId);
  if (job?.status === "failed") return job;
  if (job) return { status: "rendering", progress: job.total ? job.done / job.total : 0, stage: job.stage };
  return { status: "rendering", progress: 0, stage: "Waiting to record" };
}

/** Start recording the test unless its current audio exists or is already being made. */
export function ensureAudio(testId: string, test: ListeningTest, onChange: () => void, opts: { retry?: boolean } = {}) {
  const status = audioStatus(testId, test);
  if (status.status === "ready") return;
  const job = jobs.get(testId);
  if (job?.status === "rendering" || (job?.status === "failed" && !opts.retry)) return;
  jobs.set(testId, { status: "rendering", done: 0, total: 0, stage: "Waiting to record" });
  onChange();
  queue = queue.then(() =>
    render(testId, test, onChange).catch((err) => {
      console.error(`listening audio for ${testId} failed:`, (err as Error).message);
      jobs.set(testId, { status: "failed", error: (err as Error).message });
      onChange();
    }),
  );
}

export function deleteAudio(testId: string) {
  jobs.delete(testId);
  rmSync(dir(testId), { recursive: true, force: true });
}

async function render(testId: string, test: ListeningTest, onChange: () => void) {
  const settings = getSettings();
  const provider = settings.listeningVoices;
  let engine: Engine;
  if (provider === "openai") {
    if (!settings.openaiKey) throw new Error("OpenAI voices are selected but no API key is saved. Add your key in Settings, or switch Listening voices to Kokoro.");
    engine = openaiEngine(settings.openaiKey);
  } else engine = kokoroEngine;

  const cast = castVoices(test, provider);
  const narration = test.parts.map((_, i) => narratePart(test, i));
  const job: Job = { status: "rendering", done: 0, total: narration.flat().filter((s) => s.kind === "say").length, stage: "Preparing voices" };
  jobs.set(testId, job);
  const stage = (s: string) => {
    job.stage = s;
    onChange();
  };
  await engine.warmUp(stage);

  const out = dir(testId);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const parts: Manifest["parts"] = [];
  let lastReport = 0;
  for (const [i, segments] of narration.entries()) {
    stage(`Recording Part ${test.parts[i]!.number}`);
    const audio: Float32Array[] = [];
    const cues: Cue[] = [];
    let t = 0;
    for (const seg of segments) {
      if (seg.kind === "pause") {
        audio.push(silence(seg.seconds));
        t += seg.seconds;
        continue;
      }
      const voice = seg.voice === "narrator" ? cast.narrator : cast.parts[i]!.get(seg.voice)!;
      const speech = await engine.speak(seg.text, voice);
      const seconds = speech.length / SAMPLE_RATE;
      cues.push({ start: t, end: t + seconds, who: seg.voice, text: seg.text, ...("section" in seg ? { section: seg.section, index: seg.index } : {}) });
      // A short gap between turns, as in a real conversation.
      audio.push(speech, silence(0.35));
      t += seconds + 0.35;
      job.done += 1;
      if (Date.now() - lastReport > 1500) {
        lastReport = Date.now();
        onChange();
      }
    }
    const file = partFile(testId, i + 1);
    writeFileSync(`${file}.tmp`, encodeWav(concat(audio)));
    renameSync(`${file}.tmp`, file);
    parts.push({ duration: t, cues });
  }
  writeFileSync(join(out, "manifest.json"), JSON.stringify({ specHash: specHash(test), provider, parts } satisfies Manifest));
  jobs.delete(testId);
  onChange();
}
