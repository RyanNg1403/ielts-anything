// Listening publishing tools. Codex submits one part at a time (validated immediately), then
// finalizes: test-level checks, the independent solver pass on the transcript, publishing, and
// recording the audio in the background.
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { formatIssues, listeningPartQuestions, listeningPartSchema, listeningTestSchema, validateListeningPart, validateListeningTest, type ListeningPart, type ListeningTest } from "@ielts/spec";
import type { CodexAppServer } from "../codex/app-server.ts";
import { solveListening } from "../codex/solver.ts";
import { attempts, conversations, tests } from "../db.ts";
import { ensureAudio } from "../listening/audio.ts";
import { defineTool } from "./registry.ts";

type Draft = { mode: "full" | "drill"; title: string; topic: string; parts: ListeningPart[]; solverRuns: number; replaces?: string };
const drafts = new Map<string, Draft>();
const MAX_SOLVER_RUNS = 3;

/** Start changing a published Listening test: its parts become the draft, and finalizing replaces it in place. */
export function startListeningEdit(conversationId: string, testId: string, test: ListeningTest) {
  drafts.set(conversationId, { mode: test.mode, title: test.title, topic: test.topic, parts: test.parts, solverRuns: 0, replaces: testId });
}

/** `onAudio` is told whenever a test's recording makes progress, so open cards can refresh. */
export function listeningTools(codex: CodexAppServer, onAudio: (testId: string) => void) {
  const publishPart = defineTool({
    name: "listening_publish_part",
    description:
      "Submit one Listening part: its speakers, script and question blocks. The app validates it against the Cambridge rules immediately and returns errors to fix. " +
      "For a full test submit Parts 1, 2, 3, 4 in order (questions 1-10, 11-20, 21-30, 31-40); resubmitting a part number replaces it. A drill is one part, numbered from question 1. " +
      "Do not write instructions, the narrator's lines or pauses; the app adds them and records the audio with its own voices.",
    input: z.object({
      mode: z.enum(["full", "drill"]),
      title: z.string().describe("Title of the whole practice set."),
      topic: z.string().describe("The learner's topic in one sentence."),
      part: listeningPartSchema,
      replaceTestId: z.string().optional().describe("Only when changing an existing test after edit_test: that test's id. Resubmit just the parts you change."),
    }),
    async run({ mode, title, topic, part, replaceTestId }, ctx) {
      let draft = drafts.get(ctx.conversationId);
      if (replaceTestId && draft?.replaces !== replaceTestId) return { success: false, text: `Call edit_test for ${replaceTestId} first.` };
      const slot = mode === "full" ? part.number - 1 : 0;
      if (!draft || (!replaceTestId && (slot === 0 || draft.mode !== mode))) draft = { mode, title, topic, parts: [], solverRuns: 0 };
      if (slot > draft.parts.length) return { success: false, text: `Submit Part ${draft.parts.length + 1} first.` };

      const issues = validateListeningPart(part);
      const expectedFirst = mode === "full" ? slot * 10 + 1 : 1;
      const first = Math.min(...listeningPartQuestions(part));
      if (first !== expectedFirst) issues.unshift({ level: "error", where: `Part ${part.number}`, message: `questions must start at ${expectedFirst} (found ${first}).` });
      if (issues.some((i) => i.level === "error")) {
        ctx.emit({ type: "progress", label: `Fixing Part ${part.number}` });
        return { success: false, text: `Part ${part.number} was not accepted. Fix every error and submit it again:\n${formatIssues(issues)}` };
      }
      draft.parts = slot < draft.parts.length ? draft.parts.map((p, i) => (i === slot ? part : p)) : [...draft.parts, part];
      Object.assign(draft, { mode, title, topic, solverRuns: 0 });
      drafts.set(ctx.conversationId, draft);
      ctx.emit({ type: "progress", label: `Part ${part.number} checked` });
      const warnings = issues.length ? `\nWarnings (fix if you can, then resubmit; otherwise continue):\n${formatIssues(issues)}` : "";
      return { text: `Part ${part.number} accepted.${warnings}` };
    },
  });

  const finalize = defineTool({
    name: "listening_finalize",
    description:
      "Finish the Listening test after all parts are accepted. Runs the full-test checks and an independent solver that answers from the transcript without the key. " +
      "If the solver disagrees with your key, re-read those items: fix ambiguous or wrong items by resubmitting the part, or, if the key is clearly right and the item is unambiguous, " +
      "call this tool again listing those question numbers in confirmedKeys with a reason. When everything passes the test is published and its audio is recorded in the background.",
    input: z.object({
      confirmedKeys: z.array(z.object({ q: z.number().int(), reason: z.string() })).default([]).describe("Items where you have re-checked the script and stand by the key despite the solver."),
    }),
    async run({ confirmedKeys }, ctx) {
      const draft = drafts.get(ctx.conversationId);
      if (!draft) return { success: false, text: "No parts submitted yet. Use listening_publish_part first." };
      const test = listeningTestSchema.parse({ kind: "listening", mode: draft.mode, title: draft.title, topic: draft.topic, parts: draft.parts });
      const issues = validateListeningTest(test);
      if (issues.some((i) => i.level === "error")) return { success: false, text: `The test is not complete yet:\n${formatIssues(issues)}` };

      ctx.emit({ type: "progress", label: "Checking every question with an independent solver" });
      draft.solverRuns += 1;
      const report = await solveListening(codex, test);
      const confirmed = new Set(confirmedKeys.map((c) => c.q));
      const open = report.disagreements.filter((d) => !confirmed.has(d.q));
      if (open.length && draft.solverRuns < MAX_SOLVER_RUNS) {
        ctx.emit({ type: "progress", label: `Reviewing ${open.length} disputed question${open.length === 1 ? "" : "s"}` });
        return {
          success: false,
          text:
            `The independent solver disagreed with ${open.length} answer(s):\n` +
            open.map((d) => `- Q${d.q} (${d.family}): key "${d.key}", solver "${d.solver}"`).join("\n") +
            "\nFor each, decide whether the item is ambiguous or the key is wrong (fix and resubmit the part), or confirm the key with a reason.",
        };
      }

      const review = { solver: report, confirmedKeys, unresolved: open.map((d) => d.q), warnings: issues };
      const flagged = open.length ? ` Note: ${open.length} item(s) stayed disputed after ${MAX_SOLVER_RUNS} solver runs and are flagged for review.` : "";
      let id: string;
      if (draft.replaces) {
        id = draft.replaces;
        if (!tests.get(id)) return { success: false, text: "The test being changed no longer exists. Publish it as a new test: resubmit Part 1 without replaceTestId." };
        if (attempts.latest(id)) return { success: false, text: "The learner has taken this test since you started changing it, so it can no longer be changed. Publish a new test instead." };
        tests.update(id, { mode: test.mode, title: test.title, spec: JSON.stringify(test), review: JSON.stringify(review) });
      } else {
        id = randomUUID();
        tests.insert({ id, conversation_id: ctx.conversationId, kind: "listening", mode: test.mode, title: test.title, spec: JSON.stringify(test), review: JSON.stringify(review) });
        if (tests.forConversation(ctx.conversationId).length === 1) {
          const custom = conversations.get(ctx.conversationId)?.custom_title;
          conversations.update(ctx.conversationId, custom ? { skill: "listening" } : { title: test.title, skill: "listening" });
        }
      }
      drafts.delete(ctx.conversationId);
      const testId = id;
      ensureAudio(testId, test, () => onAudio(testId));
      ctx.emit({ type: "card", card: { kind: "test", testId } });
      return {
        text:
          (draft.replaces ? `Updated (test ${testId}). The learner's card now opens the changed test. Tell them in one sentence what changed.` : `Published (test ${testId}).`) +
          " The audio is being recorded now; the card shows its progress and opens the test when it is ready (a few minutes). " +
          "Tell the learner in one or two sentences that it is ready to take once the recording finishes, and that they will need headphones or speakers. Do not reveal answers or the script." +
          flagged,
      };
    },
  });

  return [publishPart, finalize];
}
