// Objective marking for Reading and Listening. One mark per question; text answers must match an
// accepted form and respect the word limit; choose-N groups accept letters in any order.
import { blockQuestions, type QuestionBlock, type ReadingTest } from "./reading.ts";
import type { ListeningFamily, ListeningTest } from "./listening.ts";
import { fitsLimit } from "./validate.ts";

export type KeyEntry = {
  q: number;
  passage: number; // 1-based Reading passage, or Listening part position
  family: QuestionBlock["family"] | ListeningFamily;
  display: string; // what the learner sees as the correct answer
  accept: string[];
  limit?: { maxWords: number; allowNumber: boolean };
  group?: number[]; // unordered choose-N group
  evidence: string[];
  explanation: string;
};

const clean = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

type AnyBlock = { family: KeyEntry["family"] } & Record<string, any>;

/** Key entries for one passage or part. Completion families have a word limit; the rest are letters or labels. */
function keyFromBlocks(blocks: AnyBlock[], passage: number): KeyEntry[] {
  const out: KeyEntry[] = [];
  for (const b of blocks) {
    const base = { passage, family: b.family };
    if (b.family === "mcq_multi") {
      for (const q of b.qs as number[]) out.push({ ...base, q, display: b.answers.join(", "), accept: b.answers, group: b.qs, evidence: b.evidence, explanation: b.explanation });
    } else if (b.wordLimit) {
      for (const it of b.items) out.push({ ...base, q: it.q, display: it.answer, accept: [it.answer, ...it.alternatives], limit: b.wordLimit, evidence: [it.evidence], explanation: it.explanation });
    } else {
      for (const it of b.items) out.push({ ...base, q: it.q, display: it.answer, accept: [it.answer], evidence: it.evidence ? [it.evidence] : [], explanation: it.explanation });
    }
  }
  return out;
}

export function answerKey(test: ReadingTest): KeyEntry[] {
  return test.passages.flatMap((p, pi) => keyFromBlocks(p.blocks, pi + 1)).sort((a, b) => a.q - b.q);
}

export function listeningAnswerKey(test: ListeningTest): KeyEntry[] {
  return test.parts.flatMap((p, pi) => keyFromBlocks(p.blocks, pi + 1)).sort((a, b) => a.q - b.q);
}

export type MarkedItem = { q: number; given: string; correct: boolean; key: KeyEntry };
export type ReadingResult = { raw: number; total: number; band: number | null; items: MarkedItem[] };
export type ListeningResult = ReadingResult;

function markKey(key: KeyEntry[], responses: Record<number, string>): MarkedItem[] {
  const usedInGroup = new Map<string, Set<string>>();
  return key.map((k): MarkedItem => {
    const given = (responses[k.q] ?? "").trim();
    let correct = false;
    if (k.group) {
      // Each correct letter earns one mark, whichever box it was written in.
      const groupId = k.group.join(",");
      const used = usedInGroup.get(groupId) ?? new Set<string>();
      usedInGroup.set(groupId, used);
      const letter = given.toUpperCase();
      if (k.accept.includes(letter) && !used.has(letter)) {
        used.add(letter);
        correct = true;
      }
    } else if (given) {
      const withinLimit = !k.limit || fitsLimit(given, k.limit);
      correct = withinLimit && k.accept.some((a) => clean(a) === clean(given));
    }
    return { q: k.q, given, correct, key: k };
  });
}

export function markReading(test: ReadingTest, responses: Record<number, string>): ReadingResult {
  const items = markKey(answerKey(test), responses);
  const raw = items.filter((i) => i.correct).length;
  return { raw, total: items.length, band: items.length === 40 ? readingBand(raw) : null, items };
}

export function markListening(test: ListeningTest, responses: Record<number, string>): ListeningResult {
  const items = markKey(listeningAnswerKey(test), responses);
  const raw = items.filter((i) => i.correct).length;
  return { raw, total: items.length, band: items.length === 40 ? listeningBand(raw) : null, items };
}

/** Approximate Academic Reading band (IDP reference table). Versions vary; always label as an estimate. */
export function readingBand(raw: number): number | null {
  const table: [number, number][] = [
    [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [20, 5.5], [16, 5], [13, 4.5], [10, 4], [7, 3.5], [5, 3],
  ];
  for (const [min, band] of table) if (raw >= min) return band;
  return null;
}

/** Approximate Listening band (IDP reference table, research/ielts/listening.md). Below 10 marks only the raw score is reported. */
export function listeningBand(raw: number): number | null {
  const table: [number, number][] = [
    [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4],
  ];
  for (const [min, band] of table) if (raw >= min) return band;
  return null;
}

export { blockQuestions };
