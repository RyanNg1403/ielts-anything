// Casting: which voice reads each speaker. The script gives each speaker a sex and an accent;
// the app picks distinct voices within a part and rotates them across parts so the test sounds
// like several different people, as Cambridge recordings do.
import type { Accent, ListeningTest } from "@ielts/spec";
import type { VoiceProvider } from "../settings.ts";

export type Voice = { provider: VoiceProvider; id: string; accent: Accent; instructions: string };

/** Kokoro's English voices, best first. It has no Australian or New Zealand voices: those speakers get British ones. */
const KOKORO: Record<"british" | "american", Record<"female" | "male", string[]>> = {
  british: { female: ["bf_emma", "bf_isabella", "bf_alice", "bf_lily"], male: ["bm_fable", "bm_lewis", "bm_daniel"] },
  american: { female: ["af_heart", "af_bella", "af_nicole", "af_sarah"], male: ["am_michael", "am_fenrir", "am_puck"] },
};
const KOKORO_NARRATOR = "bm_george";

/** OpenAI voices are accent-neutral; the accent comes from the instructions. */
const OPENAI: Record<"female" | "male", string[]> = { female: ["coral", "sage", "nova", "shimmer"], male: ["ash", "ballad", "verse", "onyx", "echo"] };
const OPENAI_NARRATOR = "fable";

const ACCENT_WORDS: Record<Accent, string> = {
  british: "a standard Southern British English accent (RP)",
  american: "a General American English accent",
  australian: "a natural Australian English accent",
  new_zealand: "a natural New Zealand English accent",
};

const speakerInstructions = (accent: Accent, role: string) =>
  `You are a voice actor recording an IELTS Listening test, playing this role: ${role}. Speak with ${ACCENT_WORDS[accent]}, at a natural, moderate pace, ` +
  "warm and conversational, like a real person. Read the text exactly as written. When letters are separated by commas, say each letter's name one by one.";

const NARRATOR_INSTRUCTIONS =
  "You are the narrator of an IELTS Listening test. Speak with a standard Southern British English accent (RP), clearly and calmly, at a measured pace. Read the text exactly as written.";

export type Cast = { narrator: Voice; parts: Map<string, Voice>[] };

export function castVoices(test: ListeningTest, provider: VoiceProvider): Cast {
  const narrator: Voice =
    provider === "kokoro"
      ? { provider, id: KOKORO_NARRATOR, accent: "british", instructions: "" }
      : { provider, id: OPENAI_NARRATOR, accent: "british", instructions: NARRATOR_INSTRUCTIONS };
  // Each pool keeps turning across parts, so Part 2's guide is not Part 1's receptionist.
  const turn = new Map<string, number>();
  const parts = test.parts.map((part) => {
    const used = new Set<string>([narrator.id]);
    const cast = new Map<string, Voice>();
    for (const s of part.speakers) {
      const kokoroAccent = s.accent === "american" ? "american" : "british";
      const pool = provider === "kokoro" ? KOKORO[kokoroAccent][s.sex] : OPENAI[s.sex];
      const key = provider === "kokoro" ? `${kokoroAccent}-${s.sex}` : s.sex;
      const start = turn.get(key) ?? 0;
      const pick = pool.map((_, i) => pool[(start + i) % pool.length]!).find((v) => !used.has(v)) ?? pool[start % pool.length]!;
      turn.set(key, pool.indexOf(pick) + 1);
      used.add(pick);
      cast.set(s.id, {
        provider,
        id: pick,
        accent: provider === "kokoro" ? kokoroAccent : s.accent,
        instructions: provider === "openai" ? speakerInstructions(s.accent, s.role) : "",
      });
    }
    return cast;
  });
  return { narrator, parts };
}
