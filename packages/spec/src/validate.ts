// Deterministic checks for generated Reading passages and tests. Errors block publishing;
// warnings are reported to Codex but do not block. Rules come from
// research/ielts/generation-rules.md (Cambridge 12-21 evidence).
import { PARAGRAPH_LABELS, ROMAN, blockQuestions, type Passage, type QuestionBlock, type ReadingTest } from "./reading.ts";

export type Issue = { level: "error" | "warning"; where: string; message: string };

export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip punctuation so quotes match even when Codex drops a comma or full stop. */
function loose(s: string) {
  return normalize(s).replace(/[^a-z0-9%£$€' -]/g, " ").replace(/\s+/g, " ").trim();
}

export function passageWordCount(p: Passage) {
  return p.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
}

const isNumberToken = (t: string) => /^[£$€]?\d[\d.,:/%]*(st|nd|rd|th|s)?$/i.test(t);

/** Words and numbers in an answer. Hyphenated compounds count as one word. */
export function answerShape(answer: string) {
  const tokens = answer.trim().split(/\s+/).filter(Boolean);
  return { words: tokens.filter((t) => !isNumberToken(t)).length, numbers: tokens.filter(isNumberToken).length };
}

export function fitsLimit(answer: string, limit: { maxWords: number; allowNumber: boolean }) {
  const { words, numbers } = answerShape(answer);
  if (numbers > (limit.allowNumber ? 1 : 0)) return false;
  return words <= limit.maxWords && words + numbers > 0;
}

/** Locate a quote in the passage: returns paragraph index and character offset, or null. */
export function locate(p: Passage, quote: string) {
  const q = loose(quote);
  if (q.length < 3) return null;
  let offset = 0;
  for (let i = 0; i < p.paragraphs.length; i++) {
    const para = loose(p.paragraphs[i]!);
    const at = para.indexOf(q);
    if (at !== -1) return { paragraph: i, offset: offset + at };
    offset += para.length + 1;
  }
  return null;
}

function containsPhrase(haystack: string, needle: string) {
  const h = ` ${loose(haystack)} `;
  const n = loose(needle);
  return n.length > 0 && h.includes(` ${n} `);
}

const GAP = /\{\{(\d+)\}\}/g;
function gapsIn(texts: string[]) {
  return texts.flatMap((t) => [...t.matchAll(GAP)].map((m) => Number(m[1])));
}

export function validatePassage(p: Passage, passageNumber: number): Issue[] {
  const issues: Issue[] = [];
  const at = (where: string) => `Passage ${passageNumber}${where ? `, ${where}` : ""}`;
  const err = (where: string, message: string) => issues.push({ level: "error", where: at(where), message });
  const warn = (where: string, message: string) => issues.push({ level: "warning", where: at(where), message });
  const letters = PARAGRAPH_LABELS.slice(0, p.paragraphs.length);

  // Numbering inside the passage: blocks are contiguous and ascending.
  let expected: number | null = null;
  for (const block of p.blocks) {
    const qs = blockQuestions(block);
    for (const q of qs) {
      if (expected !== null && q !== expected) err(`Q${q}`, `question numbers must be consecutive; expected ${expected}, found ${q}.`);
      expected = q + 1;
    }
  }

  for (const block of p.blocks) {
    const qs = blockQuestions(block);
    const where = `${block.family} Q${qs[0]}-${qs[qs.length - 1]}`;
    const ev = (q: number, quote: string, required: boolean) => {
      if (!quote.trim()) {
        if (required) err(`Q${q}`, "evidence quote is missing.");
        return null;
      }
      const loc = locate(p, quote);
      if (!loc) err(`Q${q}`, `evidence quote is not in the passage word for word: "${quote.slice(0, 80)}". Copy it exactly from the paragraph.`);
      return loc;
    };
    const ordered = (positions: { q: number; offset: number }[], what: string) => {
      for (let i = 1; i < positions.length; i++)
        if (positions[i]!.offset < positions[i - 1]!.offset)
          err(`Q${positions[i]!.q}`, `${what} must follow passage order, but the evidence for Q${positions[i]!.q} comes before Q${positions[i - 1]!.q}.`);
    };
    const extractedChecks = (
      items: { q: number; answer: string; alternatives: string[]; evidence: string }[],
      limit: { maxWords: number; allowNumber: boolean },
    ) => {
      const positions: { q: number; offset: number }[] = [];
      for (const it of items) {
        for (const a of [it.answer, ...it.alternatives])
          if (!fitsLimit(a, limit)) err(`Q${it.q}`, `answer "${a}" breaks the word limit (${limit.maxWords} word(s)${limit.allowNumber ? " and/or a number" : ""}).`);
        if (!containsPhrase(p.paragraphs.join(" "), it.answer)) err(`Q${it.q}`, `answer "${it.answer}" must appear in the passage exactly as written.`);
        const loc = ev(it.q, it.evidence, true);
        if (loc && !containsPhrase(it.evidence, it.answer)) err(`Q${it.q}`, `the evidence quote must contain the answer "${it.answer}".`);
        if (loc) positions.push({ q: it.q, offset: loc.offset });
      }
      return positions;
    };
    const gapChecks = (texts: string[], items: { q: number }[]) => {
      const gaps = gapsIn(texts);
      const want = items.map((i) => i.q);
      for (const q of want) {
        const n = gaps.filter((g) => g === q).length;
        if (n !== 1) err(`Q${q}`, `the gap {{${q}}} must appear exactly once in the text (found ${n}).`);
      }
      for (const g of gaps) if (!want.includes(g)) err(where, `gap {{${g}}} has no matching item.`);
    };
    const inOptions = (q: number, answer: string, options: { letter: string }[]) => {
      if (!options.some((o) => o.letter === answer)) err(`Q${q}`, `answer ${answer} is not one of the options.`);
    };
    const optionLetters = (options: { letter: string }[], what: string) => {
      options.forEach((o, i) => {
        if (o.letter !== String.fromCharCode(65 + i)) err(where, `${what} must be lettered A, B, C... in order.`);
      });
    };

    switch (block.family) {
      case "tfng":
      case "ynng": {
        const positions: { q: number; offset: number }[] = [];
        const given = block.family === "tfng" ? ["TRUE", "FALSE"] : ["YES", "NO"];
        for (const it of block.items) {
          const loc = ev(it.q, it.evidence, given.includes(it.answer));
          if (loc) positions.push({ q: it.q, offset: loc.offset });
        }
        ordered(positions, "statements");
        const labels = new Set(block.items.map((i) => i.answer));
        if (labels.size === 1) warn(where, `every answer is ${[...labels][0]}; vary the outcomes unless the passage genuinely supports this.`);
        break;
      }
      case "mcq": {
        const positions: { q: number; offset: number }[] = [];
        for (const it of block.items) {
          optionLetters(it.options, "options");
          inOptions(it.q, it.answer, it.options);
          const loc = ev(it.q, it.evidence, true);
          if (loc) positions.push({ q: it.q, offset: loc.offset });
        }
        ordered(positions, "multiple-choice questions");
        break;
      }
      case "mcq_multi": {
        optionLetters(block.options, "options");
        if (block.answers.length !== block.qs.length) err(where, `give exactly ${block.qs.length} correct letters (one per question number).`);
        if (new Set(block.answers).size !== block.answers.length) err(where, "correct letters must be different.");
        for (const a of block.answers) inOptions(block.qs[0]!, a, block.options);
        if (block.evidence.length !== block.answers.length) err(where, "give one evidence quote per correct letter.");
        block.evidence.forEach((e) => ev(block.qs[0]!, e, true));
        break;
      }
      case "matching_information": {
        for (const it of block.items) {
          if (!letters.includes(it.answer)) err(`Q${it.q}`, `paragraph ${it.answer} does not exist (paragraphs ${letters[0]}-${letters[letters.length - 1]}).`);
          const loc = ev(it.q, it.evidence, true);
          if (loc && PARAGRAPH_LABELS[loc.paragraph] !== it.answer)
            err(`Q${it.q}`, `the evidence is in paragraph ${PARAGRAPH_LABELS[loc.paragraph]}, but the answer says ${it.answer}.`);
        }
        if (!block.allowReuse && new Set(block.items.map((i) => i.answer)).size !== block.items.length)
          err(where, "a paragraph letter is used twice; set allowReuse or change the items.");
        break;
      }
      case "matching_headings": {
        const romans = ROMAN.slice(0, block.headings.length);
        if (block.headings.length <= block.items.length) err(where, "there must be more headings than paragraphs to match.");
        const surplus = block.headings.length - block.items.length;
        if (surplus < 2 || surplus > 4) warn(where, `use 2-4 surplus headings (now ${surplus}).`);
        for (const it of block.items) {
          if (!romans.includes(it.answer)) err(`Q${it.q}`, `heading ${it.answer} does not exist (i-${romans[romans.length - 1]}).`);
          if (!letters.includes(it.paragraph)) err(`Q${it.q}`, `paragraph ${it.paragraph} does not exist.`);
        }
        if (new Set(block.items.map((i) => i.answer)).size !== block.items.length) err(where, "each heading can be used only once.");
        if (new Set(block.items.map((i) => i.paragraph)).size !== block.items.length) err(where, "each paragraph is matched once.");
        const order = block.items.map((i) => letters.indexOf(i.paragraph));
        if (order.some((v, i) => i > 0 && v < order[i - 1]!)) err(where, "list the paragraphs in passage order.");
        break;
      }
      case "matching_features": {
        optionLetters(block.options, "options");
        for (const it of block.items) {
          inOptions(it.q, it.answer, block.options);
          ev(it.q, it.evidence, true);
        }
        if (!block.allowReuse && new Set(block.items.map((i) => i.answer)).size !== block.items.length)
          err(where, "an option is used twice; set allowReuse or change the items.");
        break;
      }
      case "sentence_endings": {
        optionLetters(block.endings, "endings");
        if (block.endings.length <= block.items.length) err(where, "there must be more endings than sentence beginnings.");
        const positions: { q: number; offset: number }[] = [];
        for (const it of block.items) {
          inOptions(it.q, it.answer, block.endings);
          const loc = ev(it.q, it.evidence, true);
          if (loc) positions.push({ q: it.q, offset: loc.offset });
        }
        if (new Set(block.items.map((i) => i.answer)).size !== block.items.length) err(where, "each ending is used once.");
        ordered(positions, "sentence beginnings");
        break;
      }
      case "sentence_completion": {
        for (const it of block.items) if (!it.sentence.includes("____")) err(`Q${it.q}`, "the sentence must contain the gap as ____.");
        ordered(extractedChecks(block.items, block.wordLimit), "sentences");
        break;
      }
      case "short_answer":
        ordered(extractedChecks(block.items, block.wordLimit), "questions");
        break;
      case "summary_completion":
        gapChecks([block.text], block.items);
        extractedChecks(block.items, block.wordLimit);
        break;
      case "summary_bank":
        optionLetters(block.options, "phrases");
        gapChecks([block.text], block.items);
        if (block.options.length <= block.items.length) err(where, "the word list needs more options than gaps.");
        for (const it of block.items) {
          inOptions(it.q, it.answer, block.options);
          ev(it.q, it.evidence, true);
        }
        break;
      case "note_completion":
        gapChecks(block.notes.flatMap((n) => [n.heading ?? "", ...n.lines]), block.items);
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
    }
  }

  if (p.blocks.length > 1 && new Set(p.blocks.map((b) => b.family)).size === 1) warn("", "use more than one question type in a passage.");
  return issues;
}

export function validateTest(test: ReadingTest): Issue[] {
  const issues: Issue[] = [];
  test.passages.forEach((p, i) => issues.push(...validatePassage(p, i + 1)));

  const all = test.passages.flatMap((p) => p.blocks.flatMap(blockQuestions));
  all.forEach((q, i) => {
    if (q !== i + 1) issues.push({ level: "error", where: "Test", message: `questions must run 1, 2, 3... across passages; position ${i + 1} is Q${q}.` });
  });

  const words = test.passages.map(passageWordCount);
  const total = words.reduce((a, b) => a + b, 0);
  if (test.mode === "full") {
    if (test.passages.length !== 3) issues.push({ level: "error", where: "Test", message: "a full test has exactly three passages." });
    if (all.length !== 40) issues.push({ level: "error", where: "Test", message: `a full test has 40 questions (now ${all.length}).` });
    if (total < 2150 || total > 2750) issues.push({ level: "error", where: "Test", message: `total passage length must be 2,150-2,750 words (now ${total}).` });
    const split = test.passages.map((p) => p.blocks.flatMap(blockQuestions).length);
    if (split.join("/") !== "13/13/14") issues.push({ level: "warning", where: "Test", message: `Cambridge papers split questions 13/13/14 (now ${split.join("/")}).` });
    if (!test.passages.some((p) => p.genre === "argumentative"))
      issues.push({ level: "error", where: "Test", message: "at least one passage must present a detailed logical argument (genre 'argumentative')." });
  }
  words.forEach((w, i) => {
    if (w < 650 || w > 1000) issues.push({ level: "warning", where: `Passage ${i + 1}`, message: `aim for 700-950 words (now ${w}).` });
  });
  return issues;
}

export function formatIssues(issues: Issue[]) {
  return issues.map((i) => `- [${i.level}] ${i.where}: ${i.message}`).join("\n");
}

export type { QuestionBlock };
