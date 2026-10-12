// Changing and deleting tests the learner already has.
import { readingTestSchema, speakingTestSchema } from "@ielts/spec";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { appEvents, attempts, library, tests } from "../db.ts";
import { deleteRecording } from "../recordings.ts";
import { startReadingEdit } from "./reading.ts";
import { defineTool } from "./registry.ts";

/** Remove a test with its attempts, saved answers and recordings. */
export function deleteTest(id: string) {
  for (const attemptId of tests.delete(id)) deleteRecording(attemptId);
}

export const editTest = defineTool({
  name: "edit_test",
  description:
    "Load an existing test so you can change it, when the learner asks to change, fix or adjust a test they already have (instead of making a new one). " +
    "Returns the whole test. Only tests the learner has not taken can be changed; a taken test's result belongs to its questions, so make a new test for those. " +
    "Then publish the changed test with replaceTestId: Speaking with speaking_publish (the whole test); Reading with reading_publish_passage for each passage you change, then reading_finalize. " +
    "The test keeps its id and its card. Saved but unsubmitted answers are cleared.",
  input: z.object({ testId: z.string() }),
  async run({ testId }, ctx) {
    const row = tests.get(testId);
    if (!row) return { success: false, text: "No test with that id. Call list_tests." };
    if (attempts.latest(testId)) return { success: false, text: `"${row.title}" has already been taken, so it cannot be changed. Offer to make a new test with the changes instead.` };
    if (row.kind === "speaking") {
      const test = speakingTestSchema.parse(JSON.parse(row.spec));
      return {
        text:
          `Speaking test "${row.title}". Never show or hint at its questions to the learner. Change what they asked for, keep the rest, follow the speaking-test-writer skill, ` +
          `then call speaking_publish with the whole test and replaceTestId "${testId}".\n${JSON.stringify(test)}`,
      };
    }
    const test = readingTestSchema.parse(JSON.parse(row.spec));
    startReadingEdit(ctx.conversationId, testId, test);
    return {
      text:
        `Reading test "${row.title}" is loaded for changing. Resubmit only the passages you change with reading_publish_passage and replaceTestId "${testId}" ` +
        `(same passage numbers, question numbers still continuous), then call reading_finalize.\n${JSON.stringify(test)}`,
    };
  },
});

export type DeleteRequest = { requestId: string; tests: { testId: string; title: string; skill: string; taken: boolean }[] };

/**
 * The tutor asks; the learner decides in a confirmation panel. The tool does not wait for the click
 * (Codex may cancel a tool call that waits on a person): the panel deletes the tests itself and the
 * tutor is told the outcome afterwards.
 */
export const deleteTests = defineTool({
  name: "delete_tests",
  description:
    "Delete tests when the learner asks. The app shows them a confirmation panel listing the tests; nothing is deleted unless they press Delete there. " +
    "Deleting removes the test, its results and its recording for good. Use list_tests first to find the ids.",
  input: z.object({ testIds: z.array(z.string()).min(1).max(20) }),
  async run({ testIds }, ctx) {
    const rows = library.list().filter((r) => testIds.includes(r.id));
    const missing = testIds.filter((id) => !rows.some((r) => r.id === id));
    if (missing.length) return { success: false, text: `No test with id ${missing.join(", ")}. Call list_tests.` };
    const request: DeleteRequest = {
      requestId: randomUUID(),
      tests: rows.map((r) => ({ testId: r.id, title: r.title, skill: r.kind, taken: r.submitted_at !== null })),
    };
    appEvents.add(ctx.conversationId, "delete_request", request);
    ctx.emit({ type: "confirm_delete", ...request });
    return {
      text: JSON.stringify({
        ...request,
        note: "The confirmation panel is shown. Nothing is deleted yet and you cannot delete it yourself. Say at most one short sentence pointing to the panel, then end your turn. You will be told what the learner chose.",
      }),
    };
  },
});

/** The learner answered a confirmation panel. Returns null if it was already answered or never asked. */
export function answerDeleteRequest(conversationId: string, requestId: string, confirmed: boolean) {
  const events = appEvents.list(conversationId);
  if (events.some((e) => e.kind === "delete_answer" && e.payload.requestId === requestId)) return null;
  const request = events.find((e) => e.kind === "delete_request" && e.payload.requestId === requestId)?.payload as DeleteRequest | undefined;
  if (!request) return null;
  if (confirmed) for (const t of request.tests) if (tests.get(t.testId)) deleteTest(t.testId);
  const outcome = confirmed ? "deleted" : "kept";
  appEvents.add(conversationId, "delete_answer", { requestId, outcome });
  return { request, outcome } as const;
}

export const manageTools = [editTest, deleteTests];
