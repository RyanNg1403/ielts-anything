// Objective marking for Reading. One mark per question; text answers must match an
// accepted form and respect the word limit; choose-N groups accept letters in any order.
import { blockQuestions, type QuestionBlock, type ReadingTest } from "./reading.ts";
import { fitsLimit } from "./validate.ts";

export type KeyEntry = {
  q: number;
  passage: number; // 1-based
  family: QuestionBlock["family"];
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

export function answerKey(test: ReadingTest): KeyEntry[] {
  const out: KeyEntry[] = [];
  test.passages.forEach((p, pi) => {
    for (const b of p.blocks) {
      const base = { passage: pi + 1, family: b.family };
      switch (b.family) {
        case "mcq_multi":
          b.qs.forEach((q) =>
            out.push({ ...base, q, display: b.answers.join(", "), accept: b.answers, group: b.qs, evidence: b.evidence, explanation: b.explanation }),
          );
          break;
        case "sentence_completion":
        case "short_answer":
        case "summary_completion":
        case "note_completion":
        case "table_completion":
        case "flowchart_completion":
          for (const it of b.items)
            out.push({ ...base, q: it.q, display: it.answer, accept: [it.answer, ...it.alternatives], limit: b.wordLimit, evidence: [it.evidence], explanation: it.explanation });
          break;
        case "matching_headings":
          for (const it of b.items) out.push({ ...base, q: it.q, display: it.answer, accept: [it.answer], evidence: [], explanation: it.explanation });
          break;
        default:
          for (const it of b.items) out.push({ ...base, q: it.q, display: it.answer, accept: [it.answer], evidence: it.evidence ? [it.evidence] : [], explanation: it.explanation });
      }
    }
  });
  return out.sort((a, b) => a.q - b.q);
}

export type MarkedItem = { q: number; given: string; correct: boolean; key: KeyEntry };
export type ReadingResult = { raw: number; total: number; band: number | null; items: MarkedItem[] };

export function markReading(test: ReadingTest, responses: Record<number, string>): ReadingResult {
  const key = answerKey(test);
  const usedInGroup = new Map<string, Set<string>>();
  const items = key.map((k): MarkedItem => {
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
  const raw = items.filter((i) => i.correct).length;
  return { raw, total: key.length, band: key.length === 40 ? readingBand(raw) : null, items };
}

/** Approximate Academic Reading band (IDP reference table). Versions vary; always label as an estimate. */
export function readingBand(raw: number): number | null {
  const table: [number, number][] = [
    [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [20, 5.5], [16, 5], [13, 4.5], [10, 4], [7, 3.5], [5, 3],
  ];
  for (const [min, band] of table) if (raw >= min) return band;
  return null;
}

export { blockQuestions };
