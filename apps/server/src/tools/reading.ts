// Reading publishing tools. Codex submits one passage at a time (validated immediately),
// then finalizes: test-level validation, the independent solver pass, and publishing.
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  blockQuestions,
  formatIssues,
  passageSchema,
  readingTestSchema,
  validatePassage,
  stripParagraphLabels,
  validateTest,
  type Passage,
  type ReadingTest,
} from "@ielts/spec";
import type { CodexAppServer } from "../codex/app-server.ts";
import { solveReading } from "../codex/solver.ts";
import { attempts, conversations, tests } from "../db.ts";
import { latestGenerated, markUsed } from "../writing/images.ts";
import { defineTool } from "./registry.ts";

/** `replaces` is set while the tutor is changing an existing, untaken test (see edit_test). */
type Draft = { mode: "full" | "drill"; title: string; topic: string; passages: Passage[]; solverRuns: number; replaces?: string };
const drafts = new Map<string, Draft>();

/** Start changing a published Reading test: its passages become the draft, and finalizing replaces it in place. */
export function startReadingEdit(conversationId: string, testId: string, test: ReadingTest) {
  drafts.set(conversationId, { mode: test.mode, title: test.title, topic: test.topic, passages: test.passages, solverRuns: 0, replaces: testId });
}
const MAX_SOLVER_RUNS = 3;

export function readingTools(codex: CodexAppServer) {
  const publishPassage = defineTool({
    name: "reading_publish_passage",
    description:
      "Submit one Reading passage with its question blocks. The app validates it against the Cambridge rules immediately and returns errors to fix. " +
      "Submit passages in order (1, 2, 3); resubmitting a passage number replaces it. Question numbers continue across passages (P1: 1-13, P2: 14-26, P3: 27-40 for a full test). " +
      "Do not write instructions; the app prints the official wording for each question family.",
    input: z.object({
      mode: z.enum(["full", "drill"]),
      title: z.string().describe("Title of the whole practice set."),
      topic: z.string().describe("The learner's topic in one sentence."),
      passageNumber: z.number().int().min(1).max(3),
      passage: passageSchema,
      replaceTestId: z.string().optional().describe("Only when changing an existing test after edit_test: that test's id. Resubmit just the passages you change."),
    }),
    async run({ mode, title, topic, passageNumber, passage, replaceTestId }, ctx) {
      let draft = drafts.get(ctx.conversationId);
      if (replaceTestId && draft?.replaces !== replaceTestId) return { success: false, text: `Call edit_test for ${replaceTestId} first.` };
      if (!draft || (passageNumber === 1 && !replaceTestId)) draft = { mode, title, topic, passages: [], solverRuns: 0 };
      if (passageNumber > draft.passages.length + 1)
        return { success: false, text: `Submit passage ${draft.passages.length + 1} first.` };

      const prev = draft.passages[passageNumber - 2];
      const expectedFirst = prev ? Math.max(...prev.blocks.flatMap(blockQuestions)) + 1 : 1;
      const first = Math.min(...passage.blocks.flatMap(blockQuestions));
      passage = stripParagraphLabels(passage);
      const issues = validatePassage(passage, passageNumber);
      if (first !== expectedFirst)
        issues.unshift({ level: "error", where: `Passage ${passageNumber}`, message: `questions must start at ${expectedFirst} (found ${first}).` });

      const errors = issues.filter((i) => i.level === "error");
      if (errors.length) {
        ctx.emit({ type: "progress", label: `Fixing passage ${passageNumber}` });
        return { success: false, text: `Passage ${passageNumber} was not accepted. Fix every error and submit it again:\n${formatIssues(issues)}` };
      }
      // An illustration is the image the tutor generated just before this passage (decorative only:
      // no question may depend on it). An edited passage keeps its old one unless a new one was made.
      if (passage.illustrated) {
        const fresh = latestGenerated(ctx.conversationId);
        const kept = draft.passages[passageNumber - 1]?.image;
        if (!fresh && !kept)
          return { success: false, text: `Passage ${passageNumber} is marked as illustrated, but no image was generated. Generate the illustration first, or submit it with illustrated: false.` };
        passage = { ...passage, image: fresh ?? kept };
        if (fresh) markUsed(ctx.conversationId, fresh);
      } else passage = { ...passage, image: undefined };
      draft.passages = [...draft.passages.slice(0, passageNumber - 1), passage];
      draft.mode = mode;
      draft.title = title;
      draft.topic = topic;
      draft.solverRuns = 0;
      drafts.set(ctx.conversationId, draft);
      ctx.emit({ type: "progress", label: `Passage ${passageNumber} checked` });
      const warnings = issues.length ? `\nWarnings (fix if you can, then resubmit; otherwise continue):\n${formatIssues(issues)}` : "";
      return { text: `Passage ${passageNumber} accepted.${warnings}` };
    },
  });

  const finalize = defineTool({
    name: "reading_finalize",
    description:
      "Finish the Reading test after all passages are accepted. Runs the full-test checks and an independent solver that answers the paper without the key. " +
      "If the solver disagrees with your key, re-read those items: fix ambiguous or wrong items by resubmitting the passage, or, if the key is clearly right and the item is unambiguous, " +
      "call this tool again listing those question numbers in confirmedKeys with a reason. When everything passes the test is published to the learner.",
    input: z.object({
      confirmedKeys: z
        .array(z.object({ q: z.number().int(), reason: z.string() }))
        .default([])
        .describe("Items where you have re-checked the passage and stand by the key despite the solver."),
    }),
    async run({ confirmedKeys }, ctx) {
      const draft = drafts.get(ctx.conversationId);
      if (!draft) return { success: false, text: "No passages submitted yet. Use reading_publish_passage first." };
      const test: ReadingTest = readingTestSchema.parse({ kind: "reading", mode: draft.mode, title: draft.title, topic: draft.topic, passages: draft.passages });

      const issues = validateTest(test);
      const errors = issues.filter((i) => i.level === "error");
      if (errors.length) return { success: false, text: `The test is not complete yet:\n${formatIssues(issues)}` };

      ctx.emit({ type: "progress", label: "Checking every question with an independent solver" });
      draft.solverRuns += 1;
      const report = await solveReading(codex, test);
      const confirmed = new Set(confirmedKeys.map((c) => c.q));
      const open = report.disagreements.filter((d) => !confirmed.has(d.q));

      if (open.length && draft.solverRuns < MAX_SOLVER_RUNS) {
        ctx.emit({ type: "progress", label: `Reviewing ${open.length} disputed question${open.length === 1 ? "" : "s"}` });
        return {
          success: false,
          text:
            `The independent solver disagreed with ${open.length} answer(s):\n` +
            open.map((d) => `- Q${d.q} (${d.family}): key "${d.key}", solver "${d.solver}"`).join("\n") +
            "\nFor each, decide whether the item is ambiguous or the key is wrong (fix and resubmit the passage), or confirm the key with a reason.",
        };
      }

      const review = { solver: report, confirmedKeys, unresolved: open.map((d) => d.q), warnings: issues };
      const flagged = open.length ? ` Note: ${open.length} item(s) stayed disputed after ${MAX_SOLVER_RUNS} solver runs and are flagged for review.` : "";
      if (draft.replaces) {
        const id = draft.replaces;
        if (!tests.get(id)) return { success: false, text: "The test being changed no longer exists. Publish it as a new test: resubmit passage 1 without replaceTestId." };
        if (attempts.latest(id)) return { success: false, text: "The learner has taken this test since you started changing it, so it can no longer be changed. Publish a new test instead." };
        tests.update(id, { mode: test.mode, title: test.title, spec: JSON.stringify(test), review: JSON.stringify(review) });
        drafts.delete(ctx.conversationId);
        ctx.emit({ type: "card", card: { kind: "test", testId: id } });
        return { text: `Updated (test ${id}). The learner's card now opens the changed test. Tell them in one sentence what changed.${flagged}` };
      }
      const id = randomUUID();
      tests.insert({ id, conversation_id: ctx.conversationId, kind: "reading", mode: test.mode, title: test.title, spec: JSON.stringify(test), review: JSON.stringify(review) });
      drafts.delete(ctx.conversationId);
      // The chat is named after its first test rather than the learner's first message.
      if (tests.forConversation(ctx.conversationId).length === 1) {
        const custom = conversations.get(ctx.conversationId)?.custom_title;
        conversations.update(ctx.conversationId, custom ? { skill: "reading" } : { title: test.title, skill: "reading" });
      }

      ctx.emit({ type: "card", card: { kind: "test", testId: id } });
      return {
        text:
          `Published (test ${id}). The learner sees the test card; clicking it opens the test. Tell them in one or two sentences that it is ready.` +
          flagged,
      };
    },
  });

  return [publishPassage, finalize];
}
