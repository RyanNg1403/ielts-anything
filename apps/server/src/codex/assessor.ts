// Speaking marks come from the voice examiner, which heard the candidate (pronunciation included) and
// spoke its assessment privately at the end of the test. The bands are read from its words; a text
// model only arranges the examiner's comments for the results page and never changes a judgement.
import {
  candidateWordCount,
  parseSpokenBands,
  SPEAKING_CRITERIA,
  speakingAssessmentSchema,
  speakingOverall,
  type SpeakingAssessment,
  type SpeakingResult,
  type TranscriptLine,
} from "@ielts/spec";
import type { CodexAppServer } from "./app-server.ts";
import { runStructured } from "./structured.ts";

/** Below this the sample is too small to mark (a real test has several hundred words). */
const MIN_WORDS = 40;

const FORMATTER = `You lay out an IELTS Speaking examiner's spoken assessment for a results page.
Use only what the examiner said: never change a band, never add a judgement, praise or criticism of your own.
For each criterion: summary = the examiner's comments on it in two or three clear written sentences;
strengths = things the examiner praised, each with the candidate's words it refers to;
improvements = problems the examiner named, each with the candidate's words, the issue, and the better version the examiner gave (or the obvious correction of exactly that problem).
Every quote is copied word for word from a Candidate line of the transcript; leave a list empty rather than invent.
nextSteps = the examiner's next steps. Do not run commands or read files. Answer only with the JSON.`;

export async function assessSpeaking(codex: CodexAppServer, transcript: TranscriptLine[], examinerSaid: string | null): Promise<SpeakingResult> {
  const candidateWords = candidateWordCount(transcript);
  const base = { kind: "speaking" as const, transcript, candidateWords, examinerSaid };
  if (candidateWords < MIN_WORDS)
    return { ...base, band: null, assessment: null, unmarked: `There was too little speech to mark (${candidateWords} words). Try the test again in a quiet place, with your microphone allowed.` };
  const bands = examinerSaid ? parseSpokenBands(examinerSaid) : null;
  if (!bands) return { ...base, band: null, assessment: null, unmarked: "The examiner did not finish its assessment, so this test could not be marked. Please take it again." };

  const lines = transcript.map((l) => `[Part ${l.part}] ${l.role === "examiner" ? "Examiner" : "Candidate"}: ${l.text}`).join("\n");
  const laidOut = await runStructured(codex, {
    instructions: FORMATTER,
    prompt: `THE EXAMINER'S ASSESSMENT\n${examinerSaid}\n\nTRANSCRIPT OF THE TEST\n${lines}`,
    schema: speakingAssessmentSchema,
    effort: "low",
  });
  const assessment = tidy(laidOut, transcript);
  for (const c of SPEAKING_CRITERIA) assessment[c] = { ...assessment[c], band: bands[c] };
  return { ...base, band: speakingOverall(assessment), assessment, unmarked: null };
}

/** Keep the lists short and drop quotes the candidate did not actually say. */
function tidy(a: SpeakingAssessment, transcript: TranscriptLine[]): SpeakingAssessment {
  const said = transcript.filter((l) => l.role === "candidate").map((l) => norm(l.text)).join(" ");
  const real = (q: string) => said.includes(norm(q));
  const out = { ...a, nextSteps: a.nextSteps.slice(0, 3) };
  for (const c of SPEAKING_CRITERIA)
    out[c] = { ...a[c], strengths: a[c].strengths.filter((s) => real(s.quote)).slice(0, 3), improvements: a[c].improvements.filter((s) => real(s.quote)).slice(0, 4) };
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
