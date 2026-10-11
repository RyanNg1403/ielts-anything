// What a candidate sees: the test without answers, evidence or explanations.
import { instructionsFor } from "./instructions.ts";
import { PARAGRAPH_LABELS, ROMAN, passageUsesParagraphLetters, type Passage, type ReadingTest } from "./reading.ts";

const SECRET = new Set(["answer", "answers", "alternatives", "evidence", "explanation"]);

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).filter(([k]) => !SECRET.has(k)).map(([k, v]) => [k, strip(v)]));
  return value;
}

/** The test as sent to the browser before submission. */
export function toCandidate(test: ReadingTest) {
  return strip(test) as CandidateTest;
}

export type CandidateTest = Omit<ReadingTest, "passages"> & { passages: Passage[] };

/** Plain-text rendering of the candidate paper, used by the independent solver pass. */
export function candidateText(test: ReadingTest): string {
  return test.passages.map((p, i) => passageText(p, i + 1)).join("\n\n");
}

function passageText(p: Passage, n: number) {
  const letters = passageUsesParagraphLetters(p);
  const out: string[] = [`READING PASSAGE ${n}`, p.title];
  if (p.subtitle) out.push(p.subtitle);
  p.paragraphs.forEach((para, i) => out.push(letters ? `${PARAGRAPH_LABELS[i]}  ${para}` : para));
  if (p.glossary.length) out.push(...p.glossary.map((g) => `* ${g.term}: ${g.definition}`));

  for (const b of p.blocks) {
    const ins = instructionsFor(b, p, n);
    out.push("", ins.heading, ...ins.lines);
    if (ins.legend) out.push(...ins.legend.map((l) => `${l.label}  ${l.meaning}`));
    if (ins.note) out.push(ins.note);
    switch (b.family) {
      case "tfng":
      case "ynng":
        b.items.forEach((it) => out.push(`${it.q}  ${it.statement}`));
        break;
      case "mcq":
        b.items.forEach((it) => out.push(`${it.q}  ${it.stem}`, ...it.options.map((o) => `   ${o.letter}  ${o.text}`)));
        break;
      case "mcq_multi":
        out.push(`${b.qs.join("–")}  ${b.stem}`, ...b.options.map((o) => `   ${o.letter}  ${o.text}`));
        break;
      case "matching_information":
        b.items.forEach((it) => out.push(`${it.q}  ${it.prompt}`));
        break;
      case "matching_headings":
        out.push("List of Headings", ...b.headings.map((h, i) => `${ROMAN[i]}  ${h}`));
        b.items.forEach((it) => out.push(`${it.q}  Paragraph ${it.paragraph}`));
        break;
      case "matching_features":
        b.items.forEach((it) => out.push(`${it.q}  ${it.prompt}`));
        out.push(`List of ${b.featureLabel}`, ...b.options.map((o) => `${o.letter}  ${o.text}`));
        break;
      case "sentence_endings":
        b.items.forEach((it) => out.push(`${it.q}  ${it.beginning}`));
        out.push(...b.endings.map((o) => `${o.letter}  ${o.text}`));
        break;
      case "sentence_completion":
        b.items.forEach((it) => out.push(`${it.q}  ${it.sentence}`));
        break;
      case "short_answer":
        b.items.forEach((it) => out.push(`${it.q}  ${it.question}`));
        break;
      case "summary_completion":
        if (b.title) out.push(b.title);
        out.push(b.text.replace(/\{\{(\d+)\}\}/g, "($1) ________"));
        break;
      case "summary_bank":
        if (b.title) out.push(b.title);
        out.push(b.text.replace(/\{\{(\d+)\}\}/g, "($1) ________"), ...b.options.map((o) => `${o.letter}  ${o.text}`));
        break;
      case "note_completion":
        out.push(b.title);
        for (const s of b.notes) {
          if (s.heading) out.push(s.heading);
          out.push(...s.lines.map((l) => `•  ${l.replace(/\{\{(\d+)\}\}/g, "($1) ________")}`));
        }
        break;
      case "table_completion":
        if (b.title) out.push(b.title);
        out.push(b.header.join(" | "), ...b.rows.map((r) => r.join(" | ").replace(/\{\{(\d+)\}\}/g, "($1) ________")));
        break;
      case "flowchart_completion":
        if (b.title) out.push(b.title);
        out.push(b.steps.map((s) => s.replace(/\{\{(\d+)\}\}/g, "($1) ________")).join("\n   ↓\n"));
        break;
    }
  }
  return out.join("\n");
}

/** One-line prompt for each question, used when explaining answers. */
export function questionPrompts(test: ReadingTest): Record<number, string> {
  const out: Record<number, string> = {};
  for (const p of test.passages)
    for (const b of p.blocks) {
      switch (b.family) {
        case "tfng":
        case "ynng":
          b.items.forEach((i) => (out[i.q] = i.statement));
          break;
        case "mcq":
          b.items.forEach((i) => (out[i.q] = `${i.stem} ${i.options.map((o) => `${o.letter}) ${o.text}`).join(" ")}`));
          break;
        case "mcq_multi":
          b.qs.forEach((q) => (out[q] = `${b.stem} ${b.options.map((o) => `${o.letter}) ${o.text}`).join(" ")}`));
          break;
        case "matching_information":
        case "matching_features":
          b.items.forEach((i) => (out[i.q] = i.prompt));
          break;
        case "matching_headings":
          b.items.forEach((i) => (out[i.q] = `Heading for paragraph ${i.paragraph}`));
          break;
        case "sentence_endings":
          b.items.forEach((i) => (out[i.q] = i.beginning));
          break;
        case "sentence_completion":
          b.items.forEach((i) => (out[i.q] = i.sentence));
          break;
        case "short_answer":
          b.items.forEach((i) => (out[i.q] = i.question));
          break;
        case "summary_completion":
        case "summary_bank":
          b.items.forEach((i) => (out[i.q] = gapContext([b.text], i.q)));
          break;
        case "note_completion":
          b.items.forEach((i) => (out[i.q] = gapContext(b.notes.flatMap((n) => n.lines), i.q)));
          break;
        case "table_completion":
          b.items.forEach((i) => (out[i.q] = gapContext(b.rows.map((r) => r.map((c, k) => `${b.header[k]}: ${c}`).join("; ")), i.q)));
          break;
        case "flowchart_completion":
          b.items.forEach((i) => (out[i.q] = gapContext(b.steps, i.q)));
          break;
      }
    }
  return out;
}

/** The sentence (or line) that contains gap {{q}}, with that gap shown as ____ and other gaps by number. */
function gapContext(texts: string[], q: number): string {
  const marker = `{{${q}}}`;
  const text = texts.find((t) => t.includes(marker)) ?? "";
  const sentence = text.split(/(?<=[.!?])\s+/).find((s) => s.includes(marker)) ?? text;
  return sentence.replace(marker, "____").replace(/\{\{(\d+)\}\}/g, "($1)").trim();
}
