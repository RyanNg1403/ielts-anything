// Speaking publishing: the tutor submits a whole test; the app checks it and saves it with its
// questions hidden until the learner has taken it.
import { randomUUID } from "node:crypto";
import { formatIssues, speakingMinutes, speakingTestSchema, validateSpeaking } from "@ielts/spec";
import { z } from "zod";
import { attempts, conversations, tests } from "../db.ts";
import { defineTool } from "./registry.ts";

export const speakingPublish = defineTool({
  name: "speaking_publish",
  description:
    "Publish an IELTS Speaking test (full test with Parts 1-3, or a drill of one part) written with the speaking-test-writer skill. " +
    "The app checks it against the Cambridge format and returns errors to fix. The learner never sees the questions before the test: a voice examiner asks them live. " +
    "To change an existing test the learner has not taken yet, call edit_test, then publish the whole changed test with replaceTestId.",
  input: speakingTestSchema.extend({
    replaceTestId: z.string().optional().describe("Only when changing an existing, untaken Speaking test: its id. The test keeps its id and card."),
  }),
  async run({ replaceTestId, ...test }, ctx) {
    const issues = validateSpeaking(test);
    if (issues.some((i) => i.level === "error")) return { success: false, text: `Fix these and publish again:\n${formatIssues(issues)}` };

    if (replaceTestId) {
      const row = tests.get(replaceTestId);
      if (!row || row.kind !== "speaking") return { success: false, text: "No Speaking test with that id. Call list_tests." };
      if (attempts.latest(replaceTestId)) return { success: false, text: "The learner has already taken this test, so it cannot be changed. Publish a new test instead (without replaceTestId)." };
      tests.update(replaceTestId, { mode: test.mode, title: test.title, spec: JSON.stringify(test), review: JSON.stringify({ warnings: issues }) });
      ctx.emit({ type: "card", card: { kind: "test", testId: replaceTestId } });
      return {
        text:
          `Updated (test ${replaceTestId}, about ${speakingMinutes(test)} minutes). The learner's card now opens the changed test. ` +
          "Tell them in one sentence what changed, in general terms only. Do not reveal or hint at any question.",
      };
    }

    const id = randomUUID();
    tests.insert({ id, conversation_id: ctx.conversationId, kind: "speaking", mode: test.mode, title: test.title, spec: JSON.stringify(test), review: JSON.stringify({ warnings: issues }) });
    // The chat is named after its first test rather than the learner's first message.
    if (tests.forConversation(ctx.conversationId).length === 1) {
      const custom = conversations.get(ctx.conversationId)?.custom_title;
      conversations.update(ctx.conversationId, custom ? { skill: "speaking" } : { title: test.title, skill: "speaking" });
    }
    ctx.emit({ type: "card", card: { kind: "test", testId: id } });
    return {
      text:
        `Published (test ${id}, about ${speakingMinutes(test)} minutes). The learner sees the test card; clicking it opens the speaking room, which checks their microphone first. ` +
        "Tell them in one or two sentences that it is ready, how long it takes, and that they need a microphone and a quiet place. Do not reveal or hint at any question." +
        (issues.length ? `\nWarnings to consider next time:\n${formatIssues(issues)}` : ""),
    };
  },
});
