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
  validateTest,
  type Passage,
  type ReadingTest,
} from "@ielts/spec";
import type { CodexAppServer } from "../codex/app-server.ts";
import { solveReading } from "../codex/solver.ts";
import { conversations, tests } from "../db.ts";
import { defineTool } from "./registry.ts";

type Draft = { mode: "full" | "drill"; title: string; topic: string; passages: Passage[]; solverRuns: number };
const drafts = new Map<string, Draft>();
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
    }),
    async run({ mode, title, topic, passageNumber, passage }, ctx) {
      let draft = drafts.get(ctx.conversationId);
      if (!draft || passageNumber === 1) draft = { mode, title, topic, passages: [], solverRuns: 0 };
      if (passageNumber > draft.passages.length + 1)
        return { success: false, text: `Submit passage ${draft.passages.length + 1} first.` };

      const prev = draft.passages[passageNumber - 2];
      const expectedFirst = prev ? Math.max(...prev.blocks.flatMap(blockQuestions)) + 1 : 1;
      const first = Math.min(...passage.blocks.flatMap(blockQuestions));
      const issues = validatePassage(passage, passageNumber);
      if (first !== expectedFirst)
        issues.unshift({ level: "error", where: `Passage ${passageNumber}`, message: `questions must start at ${expectedFirst} (found ${first}).` });

      const errors = issues.filter((i) => i.level === "error");
      if (errors.length) {
        ctx.emit({ type: "progress", label: `Fixing passage ${passageNumber}` });
        return { success: false, text: `Passage ${passageNumber} was not accepted. Fix every error and submit it again:\n${formatIssues(issues)}` };
      }
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

      const id = randomUUID();
      const review = { solver: report, confirmedKeys, unresolved: open.map((d) => d.q), warnings: issues };
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
          `Published (test ${id}). The learner sees a "Start test" card. Tell them in one or two sentences that it is ready.` +
          (open.length ? ` Note: ${open.length} item(s) stayed disputed after ${MAX_SOLVER_RUNS} solver runs and are flagged for review.` : ""),
      };
    },
  });

  return [publishPassage, finalize];
}
