// IELTS Listening test spec. Codex writes the script and the questions; the app adds the
// narrator, the preview and checking pauses, the voices and the printed instructions, so the
// recording and the paper always follow the Cambridge layout (books 12-21).
import { z } from "zod";
import { FAMILY_LABELS } from "./instructions.ts";
import { fitsLimit, normalize, type Issue } from "./validate.ts";
import { MAP_GRID, mapFeatureSchema, rect } from "./writing.ts";

export const ACCENTS = ["british", "american", "australian", "new_zealand"] as const;
export type Accent = (typeof ACCENTS)[number];

const evidence = z.string().describe("Exact words copied from one line of the script where the answer is heard (a few words up to one sentence).");
const explanation = z.string().describe("One or two sentences a learner reads after marking: what the speaker said, and why the tempting alternative is wrong.");

const wordLimit = z.object({
  maxWords: z.number().int().min(1).max(3).describe("1 = ONE WORD, 2 = NO MORE THAN TWO WORDS, 3 = NO MORE THAN THREE WORDS."),
  allowNumber: z.boolean().describe("true adds 'AND/OR A NUMBER'."),
});

const extracted = z.object({
  q: z.number().int(),
  answer: z.string().describe("Canonical answer exactly as the speaker says it in the script."),
  alternatives: z.array(z.string()).default([]).describe("Other accepted forms, e.g. '7.30' and '7:30', or a word with and without an optional adjective."),
  evidence,
  explanation,
});

const option = z.object({ letter: z.string().regex(/^[A-L]$/), text: z.string() });

export const listeningBlockSchema = z.discriminatedUnion("family", [
  z.object({
    family: z.literal("form_completion"),
    wordLimit,
    title: z.string().describe("Form heading, e.g. 'Climbing course booking form'."),
    fields: z
      .array(z.object({ label: z.string().describe("Printed field name, e.g. 'Surname'."), value: z.string().describe("Printed value, or a gap written as {{q}}, e.g. '{{1}}' or '£{{4}} per month'.") }))
      .min(4)
      .max(14),
    items: z.array(extracted).min(3).max(10),
  }),
  z.object({
    family: z.literal("note_completion"),
    wordLimit,
    title: z.string(),
    notes: z
      .array(z.object({ heading: z.string().optional(), lines: z.array(z.string()).min(1) }))
      .min(1)
      .describe("Note sections; lines may contain gaps written as {{q}}. Short note style, not full sentences."),
    items: z.array(extracted).min(3).max(10),
  }),
  z.object({
    family: z.literal("table_completion"),
    wordLimit,
    title: z.string().optional(),
    header: z.array(z.string()).min(2).max(5),
    rows: z.array(z.array(z.string())).min(2).max(7).describe("Cells may contain gaps written as {{q}}."),
    items: z.array(extracted).min(3).max(10),
  }),
  z.object({
    family: z.literal("flowchart_completion"),
    wordLimit,
    title: z.string().optional(),
    steps: z.array(z.string()).min(3).max(8).describe("Boxes in order; may contain gaps written as {{q}}."),
    items: z.array(extracted).min(3).max(6),
  }),
  z.object({
    family: z.literal("sentence_completion"),
    wordLimit,
    items: z.array(extracted.extend({ sentence: z.string().describe("Sentence with the gap written as ____ (four underscores).") })).min(3).max(6),
  }),
  z.object({
    family: z.literal("summary_completion"),
    wordLimit,
    title: z.string().optional(),
    text: z.string().describe("Summary prose with gaps written as {{q}}."),
    items: z.array(extracted).min(3).max(7),
  }),
  z.object({
    family: z.literal("short_answer"),
    wordLimit,
    items: z.array(extracted.extend({ question: z.string() })).min(3).max(6),
  }),
  z.object({
    family: z.literal("mcq"),
    items: z
      .array(
        z.object({
          q: z.number().int(),
          stem: z.string(),
          options: z.array(option).length(3).describe("Exactly three options, A-C."),
          answer: z.string().regex(/^[A-C]$/),
          evidence,
          explanation,
        }),
      )
      .min(1)
      .max(7),
  }),
  z.object({
    family: z.literal("mcq_multi"),
    qs: z.array(z.number().int()).min(2).max(3).describe("The scored question numbers, e.g. [17, 18] for 'Choose TWO letters'."),
    stem: z.string().describe("e.g. 'Which TWO things does the guide say about the gardens?'"),
    options: z.array(option).min(5).max(7).describe("Five options A-E is standard for choose-two."),
    answers: z.array(z.string().regex(/^[A-G]$/)).describe("The correct letters, any order; length equals qs length."),
    evidence: z.array(z.string()).describe("One script quote per correct letter."),
    explanation,
  }),
  z.object({
    family: z.literal("matching"),
    question: z.string().describe("The printed question above the items, e.g. 'What does the speaker say about each of the following activities?'"),
    optionsTitle: z.string().describe("Heading of the option box, e.g. 'Comments' or 'Reasons'."),
    allowReuse: z.boolean().describe("true for a classification (options A-C, each usable more than once); false for 'Choose FIVE answers from the box'."),
    options: z.array(option).min(3).max(8),
    items: z
      .array(z.object({ q: z.number().int(), prompt: z.string().describe("The person, place or thing to match, e.g. 'Kayaking'."), answer: z.string().regex(/^[A-L]$/), evidence, explanation }))
      .min(3)
      .max(7),
  }),
  z.object({
    family: z.literal("map_labelling"),
    kind: z.enum(["map", "plan"]).describe("map = outdoor site; plan = floor plan of a building."),
    title: z.string().describe("Printed title, e.g. 'Hillcrest Nature Reserve'."),
    compass: z.boolean().describe("true draws a north arrow; use it when the speaker gives compass directions."),
    features: z
      .array(mapFeatureSchema)
      .min(4)
      .max(20)
      .describe("Labelled landmarks the speaker refers to (entrance, roads, existing buildings). The places asked about are NOT labelled: they are marked by letters."),
    markers: z
      .array(z.object({ letter: z.string().regex(/^[A-L]$/), x: z.number(), y: z.number() }))
      .min(5)
      .max(10)
      .describe("Lettered positions on the same 100 x 70 grid, A, B, C... in order. More letters than questions."),
    items: z
      .array(z.object({ q: z.number().int(), label: z.string().describe("The place to locate, e.g. 'Café'."), answer: z.string().regex(/^[A-L]$/), evidence, explanation }))
      .min(3)
      .max(7),
  }),
]);

export type ListeningBlock = z.infer<typeof listeningBlockSchema>;
export type ListeningFamily = ListeningBlock["family"];

const speaker = z.object({
  id: z.string().min(1).describe("Short id used in the lines, e.g. 'woman', 'receptionist', 'jack', 'lecturer'."),
  role: z.string().describe("Who they are, shown in the transcript after the test, e.g. 'Receptionist', 'Jack (student)', 'Lecturer'."),
  sex: z.enum(["female", "male"]),
  accent: z.enum(ACCENTS).describe("Most speakers British; vary with one or two American, Australian or New Zealand speakers in a full test."),
});

const line = z.object({
  speaker: z.string().describe("A speaker id."),
  text: z.string().describe("What they say, written as spoken (see the listening-script-writer skill for numbers, spellings and times)."),
});

export const listeningPartSchema = z.object({
  number: z.number().int().min(1).max(4).describe("Which IELTS part this is (1-4). It sets the format: 1 everyday conversation, 2 everyday monologue, 3 educational discussion, 4 academic lecture."),
  title: z.string().describe("Short label for the test card, e.g. 'Climbing course enquiry'. Not spoken."),
  context: z.string().describe("The narrator's one-sentence introduction, starting 'You will hear', e.g. 'You will hear a woman phoning a sports centre about climbing courses.'"),
  speakers: z.array(speaker).min(1).max(4),
  sections: z
    .array(z.object({ lines: z.array(line).min(1) }))
    .min(1)
    .max(2)
    .describe("The script. Parts 1-3 are usually split into two sections with a pause to read the next questions; Part 4 is one section with no break."),
  blocks: z.array(listeningBlockSchema).min(1).max(4),
});

export type ListeningPart = z.infer<typeof listeningPartSchema>;
export type ListeningSpeaker = ListeningPart["speakers"][number];

export const listeningTestSchema = z.object({
  kind: z.literal("listening"),
  mode: z.enum(["full", "drill"]),
  title: z.string(),
  topic: z.string(),
  parts: z.array(listeningPartSchema).min(1).max(4),
});

export type ListeningTest = z.infer<typeof listeningTestSchema>;

export function listeningBlockQuestions(block: ListeningBlock): number[] {
  if (block.family === "mcq_multi") return block.qs;
  return block.items.map((i) => i.q);
}

export const listeningPartQuestions = (part: Pick<ListeningPart, "blocks">) => part.blocks.flatMap(listeningBlockQuestions);

// ---- Printed instructions ----

const NUM_WORDS = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN"];

export function listeningLimitPhrase(limit: { maxWords: number; allowNumber: boolean }) {
  const words =
    limit.maxWords === 1 ? (limit.allowNumber ? "ONE WORD AND/OR A NUMBER" : "ONE WORD ONLY") : `NO MORE THAN ${NUM_WORDS[limit.maxWords]} WORDS${limit.allowNumber ? " AND/OR A NUMBER" : ""}`;
  return `Write ${words} for each answer.`;
}

/** "A, B or C" for three letters, "A–G" for more. */
function letterList(n: number) {
  const letters = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  return n <= 3 ? `${letters.slice(0, -1).join(", ")} or ${letters.at(-1)}` : `A–${letters.at(-1)}`;
}

function range(qs: number[]) {
  const first = Math.min(...qs);
  const last = Math.max(...qs);
  return first === last ? `Question ${first}` : `Questions ${first}–${last}`;
}

export function listeningInstructionsFor(block: ListeningBlock): { heading: string; lines: string[]; note?: string } {
  const qs = listeningBlockQuestions(block);
  const heading = range(qs);
  switch (block.family) {
    case "form_completion":
      return { heading, lines: ["Complete the form below.", listeningLimitPhrase(block.wordLimit)] };
    case "note_completion":
      return { heading, lines: ["Complete the notes below.", listeningLimitPhrase(block.wordLimit)] };
    case "table_completion":
      return { heading, lines: ["Complete the table below.", listeningLimitPhrase(block.wordLimit)] };
    case "flowchart_completion":
      return { heading, lines: ["Complete the flow-chart below.", listeningLimitPhrase(block.wordLimit)] };
    case "sentence_completion":
      return { heading, lines: ["Complete the sentences below.", listeningLimitPhrase(block.wordLimit)] };
    case "summary_completion":
      return { heading, lines: ["Complete the summary below.", listeningLimitPhrase(block.wordLimit)] };
    case "short_answer":
      return { heading, lines: ["Answer the questions below.", listeningLimitPhrase(block.wordLimit)] };
    case "mcq":
      return { heading, lines: ["Choose the correct letter, A, B or C."] };
    case "mcq_multi":
      return { heading, lines: [`Choose ${NUM_WORDS[block.qs.length]} letters, ${letterList(block.options.length)}.`] };
    case "matching":
      return block.allowReuse
        ? { heading, lines: [block.question, `Write the correct letter, ${letterList(block.options.length)}, next to ${heading}.`], note: "NB You may choose any letter more than once." }
        : { heading, lines: [block.question, `Choose ${NUM_WORDS[block.items.length]} answers from the box and write the correct letter, ${letterList(block.options.length)}, next to ${heading}.`] };
    case "map_labelling":
      return { heading, lines: [`Label the ${block.kind} below.`, `Write the correct letter, ${letterList(block.markers.length)}, next to ${heading}.`] };
  }
}

export const LISTENING_FAMILY_LABELS: Record<ListeningFamily, string> = {
  form_completion: "Form completion",
  note_completion: "Note completion",
  table_completion: "Table completion",
  flowchart_completion: "Flow-chart completion",
  sentence_completion: "Sentence completion",
  summary_completion: "Summary completion",
  short_answer: "Short-answer questions",
  mcq: "Multiple choice",
  mcq_multi: "Multiple choice (more than one answer)",
  matching: "Matching",
  map_labelling: "Map and plan labelling",
};

/** A question family's printed name, for Reading or Listening. */
export function familyLabel(family: string): string {
  return LISTENING_FAMILY_LABELS[family as ListeningFamily] ?? FAMILY_LABELS[family as keyof typeof FAMILY_LABELS] ?? family;
}

export const LISTENING_PART_NAMES = ["", "Everyday conversation", "Everyday monologue", "Educational discussion", "Academic lecture"];

// ---- Script helpers ----

export type ScriptLine = { section: number; index: number; speaker: string; text: string };

export function scriptLines(part: ListeningPart): ScriptLine[] {
  return part.sections.flatMap((s, section) => s.lines.map((l, index) => ({ section, index, speaker: l.speaker, text: l.text })));
}

export function scriptWordCount(part: ListeningPart) {
  return scriptLines(part).reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);
}

function loose(s: string) {
  return normalize(s).replace(/[^a-z0-9%£$€' -]/g, " ").replace(/\s+/g, " ").trim();
}

function containsPhrase(haystack: string, needle: string) {
  const n = loose(needle);
  return n.length > 0 && ` ${loose(haystack)} `.includes(` ${n} `);
}

/** Where a quote is heard: its line and its position in words from the start of the part. */
export function locateInScript(part: ListeningPart, quote: string) {
  const q = loose(quote);
  if (q.length < 2) return null;
  let words = 0;
  for (const [i, l] of scriptLines(part).entries()) {
    const text = loose(l.text);
    const at = ` ${text} `.indexOf(` ${q} `);
    if (at !== -1) return { line: i, section: l.section, index: l.index, word: words + text.slice(0, at).split(" ").filter(Boolean).length };
    words += text.split(" ").filter(Boolean).length;
  }
  return null;
}

const GAP = /\{\{(\d+)\}\}/g;
const gapsIn = (texts: string[]) => texts.flatMap((t) => [...t.matchAll(GAP)].map((m) => Number(m[1])));

/** Evidence quotes for each scored question, in question order. */
export function questionEvidence(part: ListeningPart): { q: number; quotes: string[] }[] {
  const out: { q: number; quotes: string[] }[] = [];
  for (const b of part.blocks) {
    if (b.family === "mcq_multi") b.qs.forEach((q) => out.push({ q, quotes: b.evidence }));
    else for (const it of b.items) out.push({ q: it.q, quotes: [it.evidence] });
  }
  return out;
}

// ---- Checks ----

export function validateListeningPart(part: ListeningPart): Issue[] {
  const issues: Issue[] = [];
  const at = (where: string) => `Part ${part.number}${where ? `, ${where}` : ""}`;
  const err = (where: string, message: string) => issues.push({ level: "error", where: at(where), message });
  const warn = (where: string, message: string) => issues.push({ level: "warning", where: at(where), message });
  const lines = scriptLines(part);
  const allText = lines.map((l) => l.text).join(" \n ");

  // Speakers and the shape of each part.
  const ids = part.speakers.map((s) => s.id);
  if (new Set(ids).size !== ids.length) err("speakers", "speaker ids must be different.");
  for (const l of lines) if (!ids.includes(l.speaker)) err(`section ${l.section + 1}`, `line ${l.index + 1} uses speaker "${l.speaker}", which is not in speakers.`);
  for (const s of part.speakers) if (!lines.some((l) => l.speaker === s.id)) err("speakers", `speaker "${s.id}" never speaks.`);
  const n = part.speakers.length;
  if (part.number === 1 && n !== 2) err("speakers", "Part 1 is a conversation between two people.");
  if (part.number === 2 && n > 2) err("speakers", "Part 2 has one main speaker (at most a short introduction by a second voice).");
  if (part.number === 3 && (n < 2 || n > 4)) err("speakers", "Part 3 is a discussion between two to four speakers.");
  if (part.number === 4 && n !== 1) err("speakers", "Part 4 is a lecture or talk by one speaker.");
  if (part.number === 4 && part.sections.length !== 1) err("sections", "Part 4 runs as one section with no break.");
  if (part.number !== 4 && part.sections.length === 1) warn("sections", "Cambridge Parts 1-3 usually pause halfway so candidates can read the next questions; split the script into two sections.");
  if (!/^You will hear\b/.test(part.context.trim())) err("context", `the introduction starts "You will hear ...": "${part.context}".`);
  // Numbering inside the part.
  const qs = listeningPartQuestions(part);
  // A ten-question part runs to about 600-900 words; a shorter drill needs proportionally less.
  const words = scriptWordCount(part);
  if (words < qs.length * 45 || words > qs.length * 110) warn("script", `aim for about ${qs.length * 60}-${qs.length * 90} words of script for ${qs.length} questions (now ${words}).`);
  qs.forEach((q, i) => {
    if (i > 0 && q !== qs[i - 1]! + 1) err(`Q${q}`, `question numbers must be consecutive; expected ${qs[i - 1]! + 1}, found ${q}.`);
  });

  // Evidence: every answer is heard, in question order, with time to write it down.
  const positions: { q: number; word: number; section: number; group?: string }[] = [];
  const evidenceAt = (q: number, quote: string) => {
    if (!quote.trim()) {
      err(`Q${q}`, "evidence quote is missing.");
      return null;
    }
    const loc = locateInScript(part, quote);
    if (!loc) err(`Q${q}`, `evidence is not in the script word for word: "${quote.slice(0, 80)}". Copy it exactly from one line.`);
    return loc;
  };

  for (const block of part.blocks) {
    const bqs = listeningBlockQuestions(block);
    const where = `${block.family} Q${bqs[0]}-${bqs[bqs.length - 1]}`;
    const optionLetters = (options: { letter: string }[], what: string) =>
      options.forEach((o, i) => {
        if (o.letter !== String.fromCharCode(65 + i)) err(where, `${what} must be lettered A, B, C... in order.`);
      });
    const inOptions = (q: number, answer: string, letters: string[]) => {
      if (!letters.includes(answer)) err(`Q${q}`, `answer ${answer} is not one of the letters.`);
    };
    const gapChecks = (texts: string[], items: { q: number }[]) => {
      const gaps = gapsIn(texts);
      for (const it of items) {
        const count = gaps.filter((g) => g === it.q).length;
        if (count !== 1) err(`Q${it.q}`, `the gap {{${it.q}}} must appear exactly once (found ${count}).`);
      }
      for (const g of gaps) if (!items.some((i) => i.q === g)) err(where, `gap {{${g}}} has no matching item.`);
    };
    const extractedChecks = (items: { q: number; answer: string; alternatives: string[]; evidence: string }[], limit: { maxWords: number; allowNumber: boolean }) => {
      for (const it of items) {
        for (const a of [it.answer, ...it.alternatives])
          if (!fitsLimit(a, limit)) err(`Q${it.q}`, `answer "${a}" breaks the word limit (${limit.maxWords} word(s)${limit.allowNumber ? " and/or a number" : ""}).`);
        if (!containsPhrase(allText, it.answer)) err(`Q${it.q}`, `the answer "${it.answer}" must be said in the script exactly as written.`);
        const loc = evidenceAt(it.q, it.evidence);
        if (loc && !containsPhrase(it.evidence, it.answer)) err(`Q${it.q}`, `the evidence quote must contain the answer "${it.answer}".`);
        if (loc) positions.push({ q: it.q, word: loc.word, section: loc.section });
      }
    };
    const letterItems = (items: { q: number; answer: string; evidence: string }[], letters: string[]) => {
      for (const it of items) {
        inOptions(it.q, it.answer, letters);
        const loc = evidenceAt(it.q, it.evidence);
        if (loc) positions.push({ q: it.q, word: loc.word, section: loc.section });
      }
    };

    switch (block.family) {
      case "form_completion":
        gapChecks(block.fields.flatMap((f) => [f.label, f.value]), block.items);
        extractedChecks(block.items, block.wordLimit);
        break;
      case "note_completion":
        gapChecks(block.notes.flatMap((s) => [s.heading ?? "", ...s.lines]), block.items);
        extractedChecks(block.items, block.wordLimit);
        break;
      case "table_completion":
        gapChecks([...block.header, ...block.rows.flat()], block.items);
        for (const row of block.rows) if (row.length !== block.header.length) err(where, "every table row needs one cell per column.");
        extractedChecks(block.items, block.wordLimit);
        break;
      case "flowchart_completion":
        gapChecks(block.steps, block.items);
        extractedChecks(block.items, block.wordLimit);
        break;
      case "summary_completion":
        gapChecks([block.text], block.items);
        extractedChecks(block.items, block.wordLimit);
        break;
      case "sentence_completion":
        for (const it of block.items) if (!it.sentence.includes("____")) err(`Q${it.q}`, "the sentence must contain the gap as ____.");
        extractedChecks(block.items, block.wordLimit);
        break;
      case "short_answer":
        extractedChecks(block.items, block.wordLimit);
        break;
      case "mcq":
        for (const it of block.items) optionLetters(it.options, "options");
        letterItems(block.items, ["A", "B", "C"]);
        break;
      case "mcq_multi": {
        optionLetters(block.options, "options");
        if (block.answers.length !== block.qs.length) err(where, `give exactly ${block.qs.length} correct letters (one per question number).`);
        if (new Set(block.answers).size !== block.answers.length) err(where, "correct letters must be different.");
        for (const a of block.answers) inOptions(block.qs[0]!, a, block.options.map((o) => o.letter));
        if (block.evidence.length !== block.answers.length) err(where, "give one evidence quote per correct letter.");
        const locs = block.evidence.map((e) => evidenceAt(block.qs[0]!, e)).filter((l) => l !== null);
        // The set is answered in any order, so it sits where its first answer is heard.
        if (locs.length) for (const q of block.qs) positions.push({ q, word: Math.min(...locs.map((l) => l.word)), section: locs[0]!.section, group: where });
        break;
      }
      case "matching":
        optionLetters(block.options, "options");
        letterItems(block.items, block.options.map((o) => o.letter));
        if (!block.allowReuse) {
          if (new Set(block.items.map((i) => i.answer)).size !== block.items.length) err(where, "an option is used twice; set allowReuse or change the items.");
          if (block.options.length < block.items.length + 2) warn(where, "a 'choose from the box' set has two or three more options than items.");
        } else if (block.options.length > 4) warn(where, "a classification (allowReuse) usually has three options, A-C.");
        break;
      case "map_labelling": {
        optionLetters(block.markers, "markers");
        const letters = block.markers.map((m) => m.letter);
        letterItems(block.items, letters);
        if (new Set(block.items.map((i) => i.answer)).size !== block.items.length) err(where, "each lettered place is the answer to at most one question.");
        const surplus = block.markers.length - block.items.length;
        if (surplus < 1) err(where, "there must be more letters on the map than questions.");
        else if (surplus < 2) warn(where, "Cambridge maps have two to four more letters than questions.");
        for (const m of block.markers) {
          if (m.x < 2 || m.y < 2 || m.x > MAP_GRID.width - 2 || m.y > MAP_GRID.height - 2) err(where, `marker ${m.letter} is outside the ${MAP_GRID.width} x ${MAP_GRID.height} grid.`);
          for (const o of block.markers)
            if (o.letter > m.letter && Math.hypot(o.x - m.x, o.y - m.y) < 7) err(where, `markers ${m.letter} and ${o.letter} are too close together to tell apart.`);
        }
        const labels = block.features.map((f) => loose(f.label)).filter(Boolean);
        for (const it of block.items) if (labels.includes(loose(it.label))) err(`Q${it.q}`, `"${it.label}" is printed on the map, which gives the answer away. Leave the places asked about unlabelled.`);
        for (const f of block.features) {
          const r = rect(f.box);
          if ((f.kind === "road" || f.kind === "path") !== (r === null)) err(where, `feature "${f.label}": roads and paths use points; everything else uses a box.`);
          if (r && (r.x < 0 || r.y < 0 || r.x + r.w > MAP_GRID.width || r.y + r.h > MAP_GRID.height)) err(where, `feature "${f.label}" is outside the grid.`);
        }
        if (!block.features.some((f) => f.label.trim())) err(where, "label a few landmarks (an entrance, a road, a building) so the directions can be followed.");
        break;
      }
    }
  }

  // Listening answers come in the order of the recording, across blocks.
  const byQ = [...positions].sort((a, b) => a.q - b.q);
  for (let i = 1; i < byQ.length; i++) {
    const [prev, cur] = [byQ[i - 1]!, byQ[i]!];
    if (cur.group && cur.group === prev.group) continue;
    if (cur.word < prev.word) err(`Q${cur.q}`, `answers must come in question order: Q${cur.q} is heard before Q${prev.q}.`);
    else if (cur.word - prev.word < 8) warn(`Q${cur.q}`, `Q${cur.q} is heard straight after Q${prev.q}; leave the candidate time to write (a few more words between answers).`);
  }
  // A section boundary falls between two questions: the narrator previews each section's questions.
  for (let i = 1; i < byQ.length; i++) if (byQ[i]!.section < byQ[i - 1]!.section) err(`Q${byQ[i]!.q}`, "a question in section 1 comes after one in section 2.");
  if (part.sections.length === 2 && !byQ.some((p) => p.section === 1)) err("sections", "section 2 has no answers; move the split so each section answers a group of questions.");
  if (part.sections.length === 2 && !byQ.some((p) => p.section === 0)) err("sections", "section 1 has no answers; move the split so each section answers a group of questions.");

  const families = new Set(part.blocks.map((b) => b.family));
  if ((part.number === 2 || part.number === 3) && part.blocks.length > 1 && families.size === 1) warn("", "Parts 2 and 3 usually mix two question types.");
  return issues;
}

export function validateListeningTest(test: ListeningTest): Issue[] {
  const issues: Issue[] = [];
  for (const p of test.parts) issues.push(...validateListeningPart(p));
  const all = test.parts.flatMap(listeningPartQuestions);
  all.forEach((q, i) => {
    if (q !== i + 1) issues.push({ level: "error", where: "Test", message: `questions must run 1, 2, 3... across parts; position ${i + 1} is Q${q}.` });
  });
  if (test.mode === "full") {
    if (test.parts.map((p) => p.number).join(",") !== "1,2,3,4") issues.push({ level: "error", where: "Test", message: "a full test has Parts 1, 2, 3 and 4 in order." });
    test.parts.forEach((p) => {
      const n = listeningPartQuestions(p).length;
      if (n !== 10) issues.push({ level: "error", where: `Part ${p.number}`, message: `each part of a full test has 10 questions (now ${n}).` });
    });
    const accents = new Set(test.parts.flatMap((p) => p.speakers.map((s) => s.accent)));
    if (accents.size === 1) issues.push({ level: "warning", where: "Test", message: "Cambridge tests mix accents: give one or two speakers another accent (American, Australian or New Zealand)." });
  } else if (test.parts.length !== 1) {
    issues.push({ level: "error", where: "Test", message: "a drill has exactly one part." });
  }
  return issues;
}

// ---- The recording: narrator, previews, pauses ----

export type NarrationSegment =
  | { kind: "say"; voice: "narrator"; text: string }
  | { kind: "say"; voice: string; text: string; section: number; index: number }
  | { kind: "pause"; seconds: number };

/** Seconds to read the questions before a section: about 30 for five questions, up to a minute for ten. */
export const previewSeconds = (questions: number) => Math.max(30, Math.min(60, questions * 5));
export const CHECK_SECONDS = 30;
/** Time to check answers on screen after the recording ends. */
export const finalCheckSeconds = (test: Pick<ListeningTest, "mode">) => (test.mode === "full" ? 120 : 60);

/** Questions answered in each section of a part, derived from where their evidence is heard. */
export function sectionQuestions(part: ListeningPart): number[][] {
  const out: number[][] = part.sections.map(() => []);
  for (const { q, quotes } of questionEvidence(part)) {
    const loc = quotes.map((e) => locateInScript(part, e)).find((l) => l);
    out[loc?.section ?? 0]!.push(q);
  }
  return out.map((qs) => [...new Set(qs)].sort((a, b) => a - b));
}

const span = (qs: number[]) => (qs.length === 1 ? `question ${qs[0]}` : `questions ${qs[0]} to ${qs[qs.length - 1]}`);

/** Everything the recording plays for one part, in order. */
export function narratePart(test: ListeningTest, partIndex: number): NarrationSegment[] {
  const part = test.parts[partIndex]!;
  const out: NarrationSegment[] = [];
  const say = (text: string) => out.push({ kind: "say", voice: "narrator", text });
  const pause = (seconds: number) => out.push({ kind: "pause", seconds });
  const isFirst = partIndex === 0;
  const isLast = partIndex === test.parts.length - 1;

  if (isFirst && test.mode === "full") {
    say(
      "IELTS Listening practice test. In this test you will hear a number of different recordings, and you will have to answer questions on what you hear. " +
        "There will be time for you to read the instructions and questions, and you will have a chance to check your work. All the recordings will be played once only. " +
        "The test is in four parts. Now turn to Part 1.",
    );
    pause(1.5);
  }
  say(`Part ${part.number}. ${part.context.trim()}`);
  pause(1);
  const kind = part.number === 1 || part.number === 3 ? "conversation" : "talk";
  sectionQuestions(part).forEach((qs, section) => {
    if (qs.length) {
      say(section === 0 ? `First, you have some time to look at ${span(qs)}.` : `Before you hear the rest of the ${kind}, you have some time to look at ${span(qs)}.`);
      pause(previewSeconds(qs.length));
      say(section === 0 ? `Now listen carefully and answer ${span(qs)}.` : `Now listen and answer ${span(qs)}.`);
      pause(1);
    }
    part.sections[section]!.lines.forEach((l, index) => out.push({ kind: "say", voice: l.speaker, text: l.text, section, index }));
    pause(1.5);
  });
  if (isLast) say(test.mode === "full" ? "That is the end of the Listening test." : `That is the end of Part ${part.number}.`);
  else {
    say(`That is the end of Part ${part.number}. You now have half a minute to check your answers.`);
    pause(CHECK_SECONDS);
    say(`Now turn to Part ${test.parts[partIndex + 1]!.number}.`);
    pause(1.5);
  }
  return out;
}

// ---- What the candidate sees ----

/** The paper without the script, answers, evidence or explanations. */
export function toListeningCandidate(test: ListeningTest) {
  return {
    ...test,
    parts: test.parts.map(({ sections: _s, speakers: _sp, context: _c, ...p }) => ({ ...p, blocks: p.blocks.map(stripBlock) })),
  } as unknown as ListeningCandidate;
}

const SECRET = new Set(["answer", "answers", "alternatives", "evidence", "explanation"]);
function stripBlock(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripBlock);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k]) => !SECRET.has(k)).map(([k, v]) => [k, stripBlock(v)]));
  return value;
}

export type ListeningCandidate = Omit<ListeningTest, "parts"> & { parts: (Omit<ListeningPart, "sections" | "speakers" | "context"> & Partial<Pick<ListeningPart, "sections" | "speakers" | "context">>)[] };

const blank = (s: string) => s.replace(/\{\{(\d+)\}\}/g, "($1) ________");

/** The transcript and questions as plain text, for the independent solver pass. */
export function listeningCandidateText(test: ListeningTest): string {
  return test.parts
    .map((p) => {
      const roles = new Map(p.speakers.map((s) => [s.id, s.role]));
      const out = [`PART ${p.number}`, p.context, "", "TRANSCRIPT"];
      p.sections.forEach((s, i) => {
        if (p.sections.length > 1) out.push(`[Section ${i + 1}]`);
        for (const l of s.lines) out.push(`${roles.get(l.speaker) ?? l.speaker}: ${l.text}`);
      });
      out.push("", "QUESTIONS");
      for (const b of p.blocks) {
        const ins = listeningInstructionsFor(b);
        out.push("", ins.heading, ...ins.lines);
        if (ins.note) out.push(ins.note);
        out.push(...blockText(b));
      }
      return out.join("\n");
    })
    .join("\n\n");
}

function blockText(b: ListeningBlock): string[] {
  switch (b.family) {
    case "form_completion":
      return [b.title, ...b.fields.map((f) => `${f.label}: ${blank(f.value)}`)];
    case "note_completion":
      return [b.title, ...b.notes.flatMap((s) => [...(s.heading ? [blank(s.heading)] : []), ...s.lines.map((l) => `•  ${blank(l)}`)])];
    case "table_completion":
      return [...(b.title ? [b.title] : []), b.header.join(" | "), ...b.rows.map((r) => blank(r.join(" | ")))];
    case "flowchart_completion":
      return [...(b.title ? [b.title] : []), b.steps.map(blank).join("\n   ↓\n")];
    case "summary_completion":
      return [...(b.title ? [b.title] : []), blank(b.text)];
    case "sentence_completion":
      return b.items.map((it) => `${it.q}  ${it.sentence}`);
    case "short_answer":
      return b.items.map((it) => `${it.q}  ${it.question}`);
    case "mcq":
      return b.items.flatMap((it) => [`${it.q}  ${it.stem}`, ...it.options.map((o) => `   ${o.letter}  ${o.text}`)]);
    case "mcq_multi":
      return [`${b.qs.join("–")}  ${b.stem}`, ...b.options.map((o) => `   ${o.letter}  ${o.text}`)];
    case "matching":
      return [b.optionsTitle, ...b.options.map((o) => `${o.letter}  ${o.text}`), ...b.items.map((it) => `${it.q}  ${it.prompt}`)];
    case "map_labelling": {
      const landmarks = b.features.filter((f) => f.label.trim()).map((f) => {
        const r = rect(f.box);
        return r ? `${f.label} at (${Math.round(r.x + r.w / 2)}, ${Math.round(r.y + r.h / 2)})` : `${f.label} (${f.kind})`;
      });
      return [
        `${b.title} (${b.kind}; grid 100 x 70, x left to right, y top to bottom${b.compass ? ", north up" : ""})`,
        `Landmarks: ${landmarks.join("; ")}`,
        `Letters: ${b.markers.map((m) => `${m.letter} at (${m.x}, ${m.y})`).join("; ")}`,
        ...b.items.map((it) => `${it.q}  ${it.label}`),
      ];
    }
  }
}

/** One-line prompt for each question, used when explaining answers. */
export function listeningQuestionPrompts(test: Pick<ListeningTest, "parts">): Record<number, string> {
  const out: Record<number, string> = {};
  const gapLine = (texts: string[], q: number) =>
    (texts.find((t) => t.includes(`{{${q}}}`)) ?? "").replace(`{{${q}}}`, "____").replace(/\{\{(\d+)\}\}/g, "($1)").trim();
  for (const p of test.parts)
    for (const b of p.blocks) {
      switch (b.family) {
        case "form_completion":
          b.items.forEach((i) => (out[i.q] = gapLine(b.fields.map((f) => `${f.label}: ${f.value}`), i.q)));
          break;
        case "note_completion":
          b.items.forEach((i) => (out[i.q] = gapLine(b.notes.flatMap((s) => s.lines), i.q)));
          break;
        case "table_completion":
          b.items.forEach((i) => (out[i.q] = gapLine(b.rows.map((r) => r.map((c, k) => `${b.header[k]}: ${c}`).join("; ")), i.q)));
          break;
        case "flowchart_completion":
          b.items.forEach((i) => (out[i.q] = gapLine(b.steps, i.q)));
          break;
        case "summary_completion":
          b.items.forEach((i) => (out[i.q] = gapLine(b.text.split(/(?<=[.!?])\s+/), i.q)));
          break;
        case "sentence_completion":
          b.items.forEach((i) => (out[i.q] = i.sentence));
          break;
        case "short_answer":
          b.items.forEach((i) => (out[i.q] = i.question));
          break;
        case "mcq":
          b.items.forEach((i) => (out[i.q] = `${i.stem} ${i.options.map((o) => `${o.letter}) ${o.text}`).join(" ")}`));
          break;
        case "mcq_multi":
          b.qs.forEach((q) => (out[q] = `${b.stem} ${b.options.map((o) => `${o.letter}) ${o.text}`).join(" ")}`));
          break;
        case "matching":
          b.items.forEach((i) => (out[i.q] = `${b.question} ${i.prompt}`));
          break;
        case "map_labelling":
          b.items.forEach((i) => (out[i.q] = `Where is ${i.label} on the ${b.kind}?`));
          break;
      }
    }
  return out;
}
