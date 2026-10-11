// IELTS Academic Reading test spec. Codex produces passages through the publish tools;
// the app renders instructions from these parameters so the printed wording always
// matches the Cambridge templates.
import { z } from "zod";

export const PARAGRAPH_LABELS = "ABCDEFGHIJ".split("");
export const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];

const evidence = z
  .string()
  .describe(
    "Exact quote copied from the passage (10-40 words) that settles the answer. Empty string only for NOT GIVEN / NO-evidence answers.",
  );
const explanation = z.string().describe("One or two sentences a learner would read after marking: why this is the answer, and why the tempting alternative fails.");

const wordLimit = z.object({
  maxWords: z.number().int().min(1).max(3).describe("1 = ONE WORD ONLY, 2 = NO MORE THAN TWO WORDS, 3 = NO MORE THAN THREE WORDS."),
  allowNumber: z.boolean().describe("true adds 'AND/OR A NUMBER' to the instruction."),
});

/** Answers copied from the passage: canonical answer plus accepted alternatives. */
const extracted = z.object({
  q: z.number().int(),
  answer: z.string().describe("Canonical answer exactly as it appears in the passage."),
  alternatives: z.array(z.string()).default([]).describe("Other accepted forms, e.g. optional words dropped, or a number written as digits."),
  evidence,
  explanation,
});

const option = z.object({ letter: z.string().regex(/^[A-L]$/), text: z.string() });

const statusItem = (labels: readonly string[]) =>
  z.object({
    q: z.number().int(),
    statement: z.string(),
    answer: z.enum(labels as [string, ...string[]]),
    evidence,
    explanation,
  });

export const blockSchema = z.discriminatedUnion("family", [
  z.object({
    family: z.literal("tfng"),
    items: z.array(statusItem(["TRUE", "FALSE", "NOT GIVEN"])).min(3).max(8),
  }),
  z.object({
    family: z.literal("ynng"),
    items: z.array(statusItem(["YES", "NO", "NOT GIVEN"])).min(3).max(8),
  }),
  z.object({
    family: z.literal("mcq"),
    items: z
      .array(
        z.object({
          q: z.number().int(),
          stem: z.string(),
          options: z.array(option).length(4).describe("Exactly four options, A-D."),
          answer: z.string().regex(/^[A-D]$/),
          evidence,
          explanation,
        }),
      )
      .min(1)
      .max(6),
  }),
  z.object({
    family: z.literal("mcq_multi"),
    qs: z.array(z.number().int()).min(2).max(3).describe("The scored question numbers, e.g. [20, 21] for 'Choose TWO letters'."),
    stem: z.string().describe("e.g. 'Which TWO of the following are mentioned as reasons for ...?'"),
    options: z.array(option).min(5).max(7).describe("Five options A-E is standard for choose-two."),
    answers: z.array(z.string().regex(/^[A-G]$/)).describe("The correct letters, any order; length equals qs length."),
    evidence: z.array(z.string()).describe("One passage quote per correct letter."),
    explanation,
  }),
  z.object({
    family: z.literal("matching_information"),
    allowReuse: z.boolean().describe("true prints 'NB You may use any letter more than once.'"),
    items: z
      .array(
        z.object({
          q: z.number().int(),
          prompt: z.string().describe("A specific detail, e.g. 'a reference to the cost of ...' (not a paragraph's main idea)."),
          answer: z.string().regex(/^[A-J]$/).describe("Paragraph letter."),
          evidence,
          explanation,
        }),
      )
      .min(3)
      .max(7),
  }),
  z.object({
    family: z.literal("matching_headings"),
    headings: z.array(z.string()).min(5).max(12).describe("The heading bank in display order; numbered i, ii, iii... by the app."),
    items: z
      .array(
        z.object({
          q: z.number().int(),
          paragraph: z.string().regex(/^[A-J]$/),
          answer: z.string().describe("Roman numeral of the correct heading, e.g. 'iv'."),
          explanation,
        }),
      )
      .min(3)
      .max(8),
  }),
  z.object({
    family: z.literal("matching_features"),
    featureLabel: z.string().describe("What the options are, e.g. 'researchers', 'companies', 'periods'. Used in 'Match each statement with the correct {featureLabel}, A-E.'"),
    allowReuse: z.boolean(),
    options: z.array(option).min(3).max(8),
    items: z
      .array(z.object({ q: z.number().int(), prompt: z.string(), answer: z.string().regex(/^[A-L]$/), evidence, explanation }))
      .min(3)
      .max(7),
  }),
  z.object({
    family: z.literal("sentence_endings"),
    endings: z.array(option).min(5).max(8).describe("More endings than beginnings."),
    items: z
      .array(z.object({ q: z.number().int(), beginning: z.string(), answer: z.string().regex(/^[A-L]$/), evidence, explanation }))
      .min(3)
      .max(5),
  }),
  z.object({
    family: z.literal("sentence_completion"),
    wordLimit,
    items: z
      .array(extracted.extend({ sentence: z.string().describe("Sentence with the gap written as ____ (four underscores).") }))
      .min(3)
      .max(6),
  }),
  z.object({
    family: z.literal("short_answer"),
    wordLimit,
    items: z.array(extracted.extend({ question: z.string() })).min(3).max(6),
  }),
  z.object({
    family: z.literal("summary_completion"),
    wordLimit,
    title: z.string().optional().describe("Optional summary title."),
    text: z.string().describe("Summary prose with gaps written as {{q}}, e.g. 'The project was funded by {{14}}.'"),
    items: z.array(extracted).min(3).max(7),
  }),
  z.object({
    family: z.literal("summary_bank"),
    title: z.string().optional(),
    text: z.string().describe("Summary prose with gaps written as {{q}}."),
    options: z.array(option).min(5).max(12).describe("Word/phrase bank, more options than gaps."),
    items: z.array(z.object({ q: z.number().int(), answer: z.string().regex(/^[A-L]$/), evidence, explanation })).min(3).max(7),
  }),
  z.object({
    family: z.literal("note_completion"),
    wordLimit,
    title: z.string(),
    notes: z
      .array(z.object({ heading: z.string().optional(), lines: z.array(z.string()).min(1) }))
      .min(1)
      .describe("Note sections; lines may contain gaps written as {{q}}. Use short note style, not full sentences."),
    items: z.array(extracted).min(3).max(8),
  }),
  z.object({
    family: z.literal("table_completion"),
    wordLimit,
    title: z.string().optional(),
    header: z.array(z.string()).min(2).max(5),
    rows: z.array(z.array(z.string())).min(2).max(6).describe("Cells may contain gaps written as {{q}}."),
    items: z.array(extracted).min(3).max(7),
  }),
  z.object({
    family: z.literal("flowchart_completion"),
    wordLimit,
    title: z.string().optional(),
    steps: z.array(z.string()).min(3).max(8).describe("Boxes in order; may contain gaps written as {{q}}."),
    items: z.array(extracted).min(3).max(6),
  }),
]);

export type QuestionBlock = z.infer<typeof blockSchema>;
export type Family = QuestionBlock["family"];

export const passageSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional().describe("Optional standfirst line under the title, as in Cambridge passages."),
  genre: z.enum(["expository", "argumentative", "historical", "biographical", "scientific report", "feature"]),
  paragraphs: z
    .array(z.string())
    .min(5)
    .max(10)
    .describe("Paragraphs in order. The app labels them A, B, C... when a block refers to paragraphs."),
  glossary: z
    .array(z.object({ term: z.string(), definition: z.string() }))
    .default([])
    .describe("Footnoted technical terms, only if essential."),
  blocks: z.array(blockSchema).min(1).max(4),
});

export type Passage = z.infer<typeof passageSchema>;

export const readingTestSchema = z.object({
  kind: z.literal("reading"),
  mode: z.enum(["full", "drill"]),
  title: z.string(),
  topic: z.string(),
  passages: z.array(passageSchema).min(1).max(3),
});

export type ReadingTest = z.infer<typeof readingTestSchema>;

/** Every scored question number covered by a block, in printed order. */
export function blockQuestions(block: QuestionBlock): number[] {
  if (block.family === "mcq_multi") return block.qs;
  return block.items.map((i) => i.q);
}

export function passageUsesParagraphLetters(p: Passage) {
  return p.blocks.some((b) => b.family === "matching_information" || b.family === "matching_headings");
}
