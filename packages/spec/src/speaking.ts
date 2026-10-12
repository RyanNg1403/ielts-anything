// IELTS Speaking: the test format (Cambridge 12-20 layout), its checks, and what the learner may see
// before taking it (nothing but the outline: candidates never see the questions in advance).
import { z } from "zod";
import type { Issue } from "./validate.ts";

const question = z.string().min(5).describe("One examiner question, ending with a question mark.");

export const part1Schema = z.object({
  frames: z
    .array(
      z.object({
        topic: z.string().describe("Frame topic, e.g. 'Work or studies', 'Walking'."),
        questions: z.array(question).min(3).max(5),
      }),
    )
    .min(1)
    .max(3)
    .describe("Interview frames in order. A full test opens with a 'Work or studies' or 'Home' frame, then one or two familiar-topic frames."),
});

export const part2Schema = z.object({
  task: z.string().describe("The cue card's first line, starting 'Describe ...'."),
  prompts: z.array(z.string()).min(3).max(4).describe("The points under 'You should say:', lower-case, no question marks, e.g. 'what it is'."),
  explain: z.string().describe("The last line, starting 'and explain ...'."),
  roundingOff: z.array(question).max(2).describe("One or two short questions the examiner may ask after the talk. Not shown on the card."),
});

export const part3Schema = z.object({
  themes: z
    .array(
      z.object({
        topic: z.string().describe("Discussion theme, e.g. 'Going to the theatre'."),
        questions: z.array(question).min(2).max(4),
      }),
    )
    .min(1)
    .max(3)
    .describe("Discussion themes linked to the Part 2 subject, moving from social patterns to evaluation and speculation."),
});

export const speakingTestSchema = z.object({
  kind: z.literal("speaking"),
  mode: z.enum(["full", "drill"]).describe("full = Parts 1-3; drill = one part."),
  title: z.string(),
  topic: z.string(),
  part1: part1Schema.nullable(),
  part2: part2Schema.nullable(),
  part3: part3Schema.nullable(),
});

export type SpeakingTest = z.infer<typeof speakingTestSchema>;
export type SpeakingPartNumber = 1 | 2 | 3;

export const SPEAKING_PART_NAMES: Record<SpeakingPartNumber, string> = { 1: "Interview", 2: "Long turn", 3: "Discussion" };
/** Planned minutes per part (official ranges: 4-5, 3-4 including preparation, 4-5). */
export const SPEAKING_PART_MINUTES: Record<SpeakingPartNumber, number> = { 1: 5, 2: 4, 3: 5 };

export function speakingParts(t: Pick<SpeakingTest, "part1" | "part2" | "part3">): SpeakingPartNumber[] {
  return ([1, 2, 3] as const).filter((n) => t[`part${n}`] !== null);
}

export function speakingMinutes(t: SpeakingTest) {
  return speakingParts(t).reduce((m, n) => m + SPEAKING_PART_MINUTES[n], 0);
}

/** What the learner may see before taking the test: no questions, no cue card. */
export function toSpeakingCandidate(t: SpeakingTest) {
  return { kind: t.kind, mode: t.mode, title: t.title, topic: t.topic, parts: speakingParts(t), minutes: speakingMinutes(t) };
}
export type SpeakingCandidate = ReturnType<typeof toSpeakingCandidate>;

export function validateSpeaking(t: SpeakingTest): Issue[] {
  const issues: Issue[] = [];
  const err = (where: string, message: string) => issues.push({ level: "error", where, message });
  const warn = (where: string, message: string) => issues.push({ level: "warning", where, message });
  const parts = speakingParts(t);

  if (parts.length === 0) err("Test", "include at least one part.");
  if (t.mode === "full" && parts.length !== 3) err("Test", "a full test has Parts 1, 2 and 3.");
  if (t.mode === "drill" && parts.length !== 1) err("Test", "a drill has exactly one part.");

  const checkQuestion = (where: string, q: string) => {
    if (!q.trim().endsWith("?")) err(where, `"${q}" must be a question ending with "?".`);
    if (q.split(/\s+/).length > 28) warn(where, `"${q.slice(0, 50)}…" is long for a spoken question; examiners ask short questions.`);
  };

  if (t.part1) {
    const n = t.part1.frames.reduce((s, f) => s + f.questions.length, 0);
    if (t.mode === "full" && t.part1.frames.length < 2) err("Part 1", "a full test has an opening frame (work or studies, or home) and at least one more frame.");
    if (n < 4) err("Part 1", "ask at least 4 questions.");
    if (n > 13) err("Part 1", `${n} questions will not fit in 4-5 minutes; keep it to 12 or fewer.`);
    t.part1.frames.forEach((f, i) => f.questions.forEach((q) => checkQuestion(`Part 1 frame ${i + 1}`, q)));
  }

  if (t.part2) {
    const c = t.part2;
    if (!/^Describe\b/.test(c.task.trim())) err("Part 2", `the cue card starts with "Describe": "${c.task}".`);
    if (c.task.trim().endsWith("?")) err("Part 2", "the cue card task is an instruction, not a question.");
    if (!/^and explain\b/.test(c.explain.trim())) err("Part 2", `the last line starts with "and explain": "${c.explain}".`);
    c.prompts.forEach((p) => {
      if (p.trim().endsWith("?")) err("Part 2", `the prompt "${p}" is a reminder, not a question; remove the "?".`);
      if (/^[A-Z]/.test(p.trim()) && !/^I\b/.test(p.trim())) warn("Part 2", `prompts are lower-case reminders like "what it is": "${p}".`);
    });
    c.roundingOff.forEach((q) => checkQuestion("Part 2 rounding-off", q));
  }

  if (t.part3) {
    const n = t.part3.themes.reduce((s, th) => s + th.questions.length, 0);
    if (n < 4) err("Part 3", "ask at least 4 discussion questions.");
    if (n > 9) err("Part 3", `${n} questions will not fit in 4-5 minutes; keep it to 8 or fewer.`);
    if (t.mode === "full" && t.part3.themes.length < 2) warn("Part 3", "Cambridge tests usually discuss two linked themes.");
    t.part3.themes.forEach((th, i) => th.questions.forEach((q) => checkQuestion(`Part 3 theme ${i + 1}`, q)));
  }
  return issues;
}

// ---- The live examiner ----

/** Sentences the voice examiner says word for word; the test room recognises them to follow the parts. */
export const EXAMINER_SIGNALS = {
  part2: "Now, I'm going to give you a topic and I'd like you to talk about it for one to two minutes.",
  part3: "I'd like to discuss with you one or two more general questions related to this.",
  end: "Thank you. That is the end of the speaking test.",
};

/** Loose match for a signal in a speech transcript (recognition may change punctuation or a word). */
export function heardSignal(text: string, signal: keyof typeof EXAMINER_SIGNALS) {
  const t = text.toLowerCase();
  if (signal === "part2") return /give you a topic|talk about it for one to two minutes/.test(t);
  if (signal === "part3") return /more general questions|one or two (more )?general/.test(t);
  return /end of the speaking test|end of the test/.test(t);
}

export type CueCard = { task: string; prompts: string[]; explain: string };

// ---- The examiner's own assessment (spoken privately after the test, with the learner muted) ----

export const ASSESSMENT_HEADINGS = {
  fluency: "Fluency and coherence",
  lexical: "Lexical resource",
  grammar: "Grammatical range and accuracy",
  pronunciation: "Pronunciation",
} as const;

const NUMBER_WORDS: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };

const BAND_PATTERNS: Record<SpeakingCriterion, RegExp> = {
  fluency: /fluency(?: and coherence)?[^a-z0-9]{0,6}(?:is |gets |at )?band[^a-z0-9]{0,3}(\d|zero|one|two|three|four|five|six|seven|eight|nine)\b/gi,
  lexical: /lexical(?: resource)?[^a-z0-9]{0,6}(?:is |gets |at )?band[^a-z0-9]{0,3}(\d|zero|one|two|three|four|five|six|seven|eight|nine)\b/gi,
  grammar: /grammatical(?: range)?(?: and accuracy)?[^a-z0-9]{0,6}(?:is |gets |at )?band[^a-z0-9]{0,3}(\d|zero|one|two|three|four|five|six|seven|eight|nine)\b/gi,
  pronunciation: /pronunciation[^a-z0-9]{0,6}(?:is |gets |at )?band[^a-z0-9]{0,3}(\d|zero|one|two|three|four|five|six|seven|eight|nine)\b/gi,
};

/**
 * Split the examiner's spoken assessment into its parts, in its own words: per criterion the
 * evidence, the descriptor it matched and the band ("... Fluency and coherence band 7."), then the
 * next steps. The last "<criterion> band N" decides, so a band mentioned in the evidence does not.
 * Speech recognition may write numbers as words. Returns null unless all four bands are present.
 */
export function parseSpokenAssessment(text: string): SpeakingAssessment | null {
  const out = {} as SpeakingAssessment;
  let from = Math.max(0, text.search(/\bassessment\b/i));
  for (const c of SPEAKING_CRITERIA) {
    const m = [...text.matchAll(BAND_PATTERNS[c])].at(-1);
    if (!m) return null;
    const word = m[1]!.toLowerCase();
    const band = /\d/.test(word) ? Number(word) : NUMBER_WORDS[word]!;
    if (!(band >= 0 && band <= 9)) return null;
    const section = m.index >= from ? text.slice(from, m.index) : "";
    const body = section.replace(/^\W*(assessment\W+)?(fluency and coherence|lexical resource|grammatical range and accuracy|pronunciation)?\W*/i, "");
    const at = body.search(/descriptor\s*:/i);
    out[c] = {
      band,
      evidence: tidy((at === -1 ? body : body.slice(0, at)).replace(/^evidence\s*:?\s*/i, "")),
      descriptor: at === -1 ? "" : tidy(body.slice(at).replace(/^descriptor\s*:?\s*/i, "")),
    };
    from = Math.max(from, m.index + m[0].length);
  }
  const next = text.slice(from).match(/next steps\s*:?\s*([\s\S]*?)(?:end of (?:the )?assessment|$)/i);
  out.nextSteps = next ? tidy(next[1]!) : "";
  return out;
}

const tidy = (s: string) => {
  const t = s.replace(/\s+/g, " ").replace(/^[\s.,;:]+|[\s,;:]+$/g, "").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// ---- Marking ----

export const SPEAKING_CRITERIA = ["fluency", "lexical", "grammar", "pronunciation"] as const;
export type SpeakingCriterion = (typeof SPEAKING_CRITERIA)[number];
export const SPEAKING_CRITERION_NAMES: Record<SpeakingCriterion, string> = {
  fluency: "Fluency and Coherence",
  lexical: "Lexical Resource",
  grammar: "Grammatical Range and Accuracy",
  pronunciation: "Pronunciation",
};

export const transcriptLineSchema = z.object({
  role: z.enum(["examiner", "candidate"]),
  part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string(),
});
export type TranscriptLine = z.infer<typeof transcriptLineSchema>;

/** One criterion of the examiner's spoken assessment, in its own words. */
export type CriterionAssessment = { band: number; evidence: string; descriptor: string };

/** The examiner's assessment; the overall band is computed from it, never chosen by a model. */
export type SpeakingAssessment = Record<SpeakingCriterion, CriterionAssessment> & { nextSteps: string };

/** IELTS overall: the mean of the four criteria, rounded to the nearest half band (.25 and .75 round up). */
export function speakingOverall(a: Pick<SpeakingAssessment, SpeakingCriterion>) {
  const mean = SPEAKING_CRITERIA.reduce((s, c) => s + a[c].band, 0) / 4;
  return Math.floor(mean * 2 + 0.5) / 2;
}

export type SpeakingResult = {
  kind: "speaking";
  band: number | null;
  assessment: SpeakingAssessment | null;
  /** Set when the test could not be marked (too little speech, or no assessment from the examiner). */
  unmarked: string | null;
  /** The examiner's spoken assessment, word for word (the source of every band). */
  examinerSaid?: string | null;
  transcript: TranscriptLine[];
  candidateWords: number;
};

/**
 * Examiner turns that go on after their question, i.e. the examiner answering for the candidate.
 * A turn is the examiner's consecutive lines; it counts when 15 or more words follow its last "?"
 * (the closing sentence excluded).
 */
export function examinerSelfAnswers(lines: TranscriptLine[]) {
  const turns: string[] = [];
  let turn = "";
  for (const l of [...lines, { role: "candidate" as const, part: 1 as const, text: "" }]) {
    if (l.role === "examiner") turn = turn ? `${turn} ${l.text}` : l.text;
    else if (turn) (turns.push(turn), (turn = ""));
  }
  return turns.filter((t) => {
    const at = t.lastIndexOf("?");
    if (at === -1) return false;
    const after = t.slice(at + 1).replace(/thank you\.?\s*that is the end of the (speaking )?test\.?/i, "");
    return after.split(/\s+/).filter(Boolean).length >= 15;
  });
}

export function candidateWordCount(lines: TranscriptLine[]) {
  return lines.filter((l) => l.role === "candidate").reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);
}

/** Timing evidence from the test room, because the transcript hides hesitation. */
export const speakingMetricsSchema = z.object({
  partSeconds: z.record(z.string(), z.number()),
  /** Part 2 talk: seconds from "start speaking" to the end of the talk. */
  longTurnSeconds: z.number().nullable(),
  /** Pauses of 3 seconds or more while the candidate was giving the Part 2 talk. */
  longTurnPauses: z.number().nullable(),
});
export type SpeakingMetrics = z.infer<typeof speakingMetricsSchema>;

export function speakingTestText(t: SpeakingTest) {
  const out: string[] = [];
  if (t.part1) {
    out.push("PART 1");
    for (const f of t.part1.frames) out.push(`${f.topic}:`, ...f.questions.map((q) => `- ${q}`));
  }
  if (t.part2) {
    out.push("", "PART 2", t.part2.task, "You should say:", ...t.part2.prompts.map((p) => `  ${p}`), t.part2.explain);
    if (t.part2.roundingOff.length) out.push("Rounding-off:", ...t.part2.roundingOff.map((q) => `- ${q}`));
  }
  if (t.part3) {
    out.push("", "PART 3");
    for (const th of t.part3.themes) out.push(`${th.topic}:`, ...th.questions.map((q) => `- ${q}`));
  }
  return out.join("\n");
}
