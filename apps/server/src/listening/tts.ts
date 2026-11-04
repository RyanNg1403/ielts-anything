// Speech engines. Both return mono float samples at 24 kHz, so parts can be stitched directly.
// Kokoro runs on this computer (free; the model downloads once); OpenAI is paid and uses the
// learner's own API key.
import { join } from "node:path";
import { env } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";
import { APP_HOME } from "../codex/home.ts";
import type { Voice } from "./voices.ts";

export const SAMPLE_RATE = 24_000;

export type Engine = {
  /** Prepare the engine (download the model the first time). */
  warmUp: (onStage: (stage: string) => void) => Promise<void>;
  speak: (text: string, voice: Voice) => Promise<Float32Array>;
};

/** Split long speech into sentence-sized chunks (Kokoro reads at most ~500 phonemes at once). */
export function chunkText(text: string, max: number): string[] {
  const sentences = text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const out: string[] = [];
  for (const s of sentences) {
    const last = out.at(-1);
    if (last && last.length + s.length + 1 <= max) out[out.length - 1] = `${last} ${s}`;
    else if (s.length <= max) out.push(s);
    else out.push(...(s.match(new RegExp(`.{1,${max}}(?:\\s|$)`, "g")) ?? [s]).map((p) => p.trim()));
  }
  return out;
}

export function concat(chunks: Float32Array[]) {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

export const silence = (seconds: number) => new Float32Array(Math.round(seconds * SAMPLE_RATE));

const LETTERS_GB: Record<string, string> = {
  A: "ay", B: "bee", C: "see", D: "dee", E: "ee", F: "eff", G: "gee", H: "aitch", I: "eye", J: "jay", K: "kay", L: "el", M: "em",
  N: "en", O: "oh", P: "pee", Q: "cue", R: "ar", S: "ess", T: "tee", U: "you", V: "vee", W: "double you", X: "ex", Y: "why", Z: "zed",
};

/** Kokoro reads text literally: spell letter sequences out by name and read clock times as times. */
export function prepareForKokoro(text: string, accent: "british" | "american" | string) {
  const name = (l: string) => (l === "Z" && accent === "american" ? "zee" : LETTERS_GB[l]!);
  return text
    .replace(/\b[A-Z](?:(?:, ?| |-)[A-Z]\b)+/g, (m) => m.split(/, ?| |-/).map(name).join(", "))
    .replace(/\b(\d{1,2})\.(\d{2})(?=\s?(?:am|pm|a\.m\.|p\.m\.|o'clock)\b)/gi, "$1:$2");
}

// The model is cached in the app home, not inside node_modules.
env.cacheDir = join(APP_HOME, "models");
let kokoroModel: Promise<KokoroTTS> | null = null;

export const kokoroEngine: Engine = {
  async warmUp(onStage) {
    if (!kokoroModel) {
      onStage("Loading the voice model (the first time, it downloads about 90 MB)");
      kokoroModel = KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
      kokoroModel.catch(() => (kokoroModel = null));
    }
    await kokoroModel;
  },
  async speak(text, voice) {
    const tts = await kokoroModel!;
    const parts: Float32Array[] = [];
    for (const chunk of chunkText(prepareForKokoro(text, voice.accent), 280)) {
      const audio = await tts.generate(chunk, { voice: voice.id as never, speed: 1 });
      parts.push(audio.audio as Float32Array, silence(0.12));
    }
    return concat(parts);
  },
};

export function openaiEngine(apiKey: string): Engine {
  async function request(input: string, voice: Voice, attempt = 0): Promise<Float32Array> {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: voice.id, input, instructions: voice.instructions, response_format: "pcm" }),
      signal: AbortSignal.timeout(120_000),
    });
    if ((r.status === 429 || r.status >= 500) && attempt < 3) {
      await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
      return request(input, voice, attempt + 1);
    }
    if (r.status === 401) throw new Error("OpenAI rejected the API key. Update it in Settings, or switch Listening voices to Kokoro.");
    if (!r.ok) throw new Error(`OpenAI speech failed (${r.status}): ${(await r.text()).slice(0, 200)}`);
    // 16-bit little-endian mono PCM at 24 kHz.
    const pcm = new Int16Array(await r.arrayBuffer());
    const out = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) out[i] = pcm[i]! / 32768;
    return out;
  }
  return {
    async warmUp() {},
    async speak(text, voice) {
      const parts: Float32Array[] = [];
      for (const chunk of chunkText(text, 1500)) parts.push(await request(chunk, voice));
      return concat(parts);
    },
  };
}

/** 16-bit PCM WAV. */
export function encodeWav(samples: Float32Array) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i]!)) * 32767), i * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
