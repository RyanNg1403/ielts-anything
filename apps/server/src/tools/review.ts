// Tools the tutor uses after tests exist: find them, read results, and show cards.
import { questionPrompts, readingTestSchema } from "@ielts/spec";
import { z } from "zod";
import { attempts, library, tests } from "../db.ts";
import { defineTool } from "./registry.ts";

function status(row: { raw: number | null; in_progress: number }) {
  return row.raw !== null ? "scored" : row.in_progress ? "in progress" : "not started";
}

export const listTests = defineTool({
  name: "list_tests",
  description: "List the learner's tests (newest first) with status and score. Use to resolve references like 'my last test' or 'the AI test'.",
  input: z.object({ scope: z.enum(["this_chat", "all"]).default("this_chat") }),
  async run({ scope }, ctx) {
    const rows = library.list().filter((r) => scope === "all" || r.conversation_id === ctx.conversationId);
    if (!rows.length) return { text: scope === "this_chat" ? "No tests in this chat yet. Try scope 'all'." : "The learner has no tests yet." };
    return {
      text: JSON.stringify(
        rows.map((r) => ({ testId: r.id, title: r.title, skill: r.kind, mode: r.mode, status: status(r), raw: r.raw, total: r.total, band: r.band })),
      ),
    };
  },
});

export const getTestResult = defineTool({
  name: "get_test_result",
  description:
    "Get a submitted test's marked answers: for each question the prompt, the learner's answer, the key, whether it was correct, the evidence quote and the explanation. Use before explaining answers or discussing a score.",
  input: z.object({ testId: z.string() }),
  async run({ testId }) {
    const row = tests.get(testId);
    if (!row) return { success: false, text: "No test with that id. Call list_tests." };
    const attempt = attempts.latest(testId);
    if (!attempt) return { success: false, text: "The learner has not submitted this test yet." };
    const spec = readingTestSchema.parse(JSON.parse(row.spec));
    const prompts = questionPrompts(spec);
    const result = JSON.parse(attempt.result);
    return {
      text: JSON.stringify({
        title: row.title,
        raw: result.raw,
        total: result.total,
        band: result.band,
        items: result.items.map((i: any) => ({
          q: i.q,
          passage: i.key.passage,
          family: i.key.family,
          prompt: prompts[i.q],
          given: i.given || null,
          key: i.key.display,
          correct: i.correct,
          evidence: i.key.evidence,
          explanation: i.key.explanation,
        })),
      }),
    };
  },
});

export const showTest = defineTool({
  name: "show_test",
  description: "Show a test card (start, continue or review) in the chat.",
  input: z.object({ testId: z.string() }),
  async run({ testId }, ctx) {
    if (!tests.get(testId)) return { success: false, text: "No test with that id." };
    ctx.emit({ type: "card", card: { kind: "test", testId } });
    return { text: "Test card shown." };
  },
});

export const showScore = defineTool({
  name: "show_score",
  description: "Show the score card for a submitted test: band, raw score, per part and per question type.",
  input: z.object({ testId: z.string() }),
  async run({ testId }, ctx) {
    if (!attempts.latest(testId)) return { success: false, text: "That test has not been submitted yet." };
    ctx.emit({ type: "card", card: { kind: "score", testId } });
    return { text: "Score card shown." };
  },
});

export const explainQuestions = defineTool({
  name: "explain_questions",
  description:
    "Show explanation cards for specific questions of a submitted test: the learner's answer, the key, the passage evidence highlighted, and your explanation. " +
    "Call get_test_result first, then write a short, specific explanation for each question (why the key is right, and what made the learner's answer tempting). " +
    "The card already shows the learner's answer, the key and the evidence quote, so do not restate them; start with the reasoning.",
  input: z.object({
    testId: z.string(),
    items: z.array(z.object({ q: z.number().int(), explanation: z.string() })).min(1).max(14),
  }),
  async run({ testId, items }, ctx) {
    if (!attempts.latest(testId)) return { success: false, text: "That test has not been submitted yet." };
    ctx.emit({ type: "card", card: { kind: "explain", testId, items } });
    return { text: `Explanations shown for ${items.map((i) => `Q${i.q}`).join(", ")}.` };
  },
});

export const reviewTools = [listTests, getTestResult, showTest, showScore, explainQuestions];
