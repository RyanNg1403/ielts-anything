// Writing publishing: the tutor submits a whole test; the app checks it and saves it. Unlike
// Speaking, the candidate may read the tasks before starting, as in the real booklet.
// Maps and process diagrams are images the tutor generated just before publishing: the app attaches
// the latest one and has a model check it against the figure's data before accepting it.
import { randomUUID } from "node:crypto";
import { formatIssues, task1Family, validateWriting, writingMinutes, writingTestSchema, type Figure, type WritingTest } from "@ielts/spec";
import { z } from "zod";
import type { CodexAppServer } from "../codex/app-server.ts";
import { runStructured } from "../codex/structured.ts";
import { attempts, conversations, tests } from "../db.ts";
import { figurePath, latestGenerated, markUsed } from "../writing/images.ts";
import { defineTool, type ToolContext } from "./registry.ts";

const drawn = (f: Figure) => f.kind === "map" || f.kind === "process";

const checkSchema = z.object({
  problems: z.array(z.string()).describe("Every mismatch between the image and the data, one per item. Empty when the image is faithful."),
  faithful: z.boolean(),
});

const CHECK = `You check an IELTS Writing Task 1 figure before learners see it. You get the figure's data (JSON) and the image drawn from it. The data is the truth: candidates are marked against it.

Report a problem for each of these:
- A label from the data (stage label, map feature label, plan heading, title, arrow label) that is missing, misspelled, garbled or unreadable.
- Any text in the image that is not in the data, or any extra stage, feature or arrow.
- Process: stages not in the data's order, a wrong stage number, an arrow missing, reversed or pointing to the wrong stage.
- Map: a feature in the wrong plan, a change between the plans that the data does not have, or positions that clearly contradict the data (north is up; the data gives [x, y, width, height] on a 100 x 70 grid). The drawing may be pictorial and need not match the grid exactly.
- Anything that would confuse a candidate: overlapping text, illegible small print, colour where the figure should be black and white.

faithful is true only when there are no problems.`;

async function checkImage(codex: CodexAppServer, figure: Figure, imageId: string) {
  const { image: _image, ...data } = figure as Figure & { image?: string };
  return runStructured(codex, {
    instructions: CHECK,
    prompt: `Figure data:\n${JSON.stringify(data, null, 1)}\n\nThe attached image was drawn from this data. Check it.`,
    schema: checkSchema,
    images: [figurePath(imageId)],
    effort: "high",
  });
}

export function writingTools(codex: CodexAppServer) {
  /** Attach the tutor's latest image to the map or process figure, after checking it. Returns an error text, or null. */
  async function attachImages(test: WritingTest, ctx: ToolContext, previous: WritingTest | null): Promise<string | null> {
    const figures = test.task1?.figures.filter(drawn) ?? [];
    for (const f of figures) {
      const fresh = latestGenerated(ctx.conversationId);
      const kept = previous?.task1?.figures.find((p) => p.kind === f.kind && JSON.stringify({ ...p, image: undefined }) === JSON.stringify({ ...f, image: undefined })) as
        | (Figure & { image?: string })
        | undefined;
      const id = fresh ?? kept?.image ?? null;
      if (!id)
        return `Task 1 has a ${f.kind === "map" ? "map" : "process diagram"}, which must be drawn with image generation. Follow the writing-task-writer skill: look at the reference images, generate the image, then call writing_publish again.`;
      if (id === fresh) {
        const check = await checkImage(codex, f, id);
        markUsed(ctx.conversationId, id);
        if (!check.faithful)
          return `The generated image does not match the figure data, so it was not used:\n${check.problems.map((p) => `- ${p}`).join("\n")}\nGenerate a corrected image (fix the data instead if it was the data that was wrong), then call writing_publish again.`;
      }
      (f as Figure & { image?: string }).image = id;
    }
    return null;
  }

  const writingPublish = defineTool({
    name: "writing_publish",
    description:
      "Publish an IELTS Academic Writing test (full test with Task 1 and Task 2, or a drill of one task) written with the writing-task-writer skill. " +
      "Line, bar, pie and table figures are data the app draws. Maps and process diagrams must be generated as an image first (see the skill); the app attaches your latest image and checks it against the data. " +
      "The app checks the test against the Cambridge format and returns errors to fix. " +
      "To change an existing test the learner has not taken yet, call edit_test, then publish the whole changed test with replaceTestId.",
    input: writingTestSchema.extend({
      replaceTestId: z.string().optional().describe("Only when changing an existing, untaken Writing test: its id. The test keeps its id and card."),
    }),
    async run({ replaceTestId, ...test }, ctx) {
      const issues = validateWriting(test);
      if (issues.some((i) => i.level === "error")) return { success: false, text: `Fix these and publish again:\n${formatIssues(issues)}` };
      const what = [test.task1 && `Task 1 (${task1Family(test.task1)})`, test.task2 && `Task 2 (${test.task2.family})`].filter(Boolean).join(" and ");

      const row = replaceTestId ? tests.get(replaceTestId) : null;
      if (replaceTestId) {
        if (!row || row.kind !== "writing") return { success: false, text: "No Writing test with that id. Call list_tests." };
        if (attempts.latest(replaceTestId)) return { success: false, text: "The learner has already taken this test, so it cannot be changed. Publish a new test instead (without replaceTestId)." };
      }
      const imageError = await attachImages(test, ctx, row ? writingTestSchema.parse(JSON.parse(row.spec)) : null);
      if (imageError) return { success: false, text: imageError };

      if (replaceTestId) {
        tests.update(replaceTestId, { mode: test.mode, title: test.title, spec: JSON.stringify(test), review: JSON.stringify({ warnings: issues }) });
        ctx.emit({ type: "card", card: { kind: "test", testId: replaceTestId } });
        return { text: `Updated (test ${replaceTestId}: ${what}, ${writingMinutes(test)} minutes). Tell the learner in one sentence what changed.` };
      }

      const id = randomUUID();
      tests.insert({ id, conversation_id: ctx.conversationId, kind: "writing", mode: test.mode, title: test.title, spec: JSON.stringify(test), review: JSON.stringify({ warnings: issues }) });
      if (tests.forConversation(ctx.conversationId).length === 1) {
        const custom = conversations.get(ctx.conversationId)?.custom_title;
        conversations.update(ctx.conversationId, custom ? { skill: "writing" } : { title: test.title, skill: "writing" });
      }
      ctx.emit({ type: "card", card: { kind: "test", testId: id } });
      return {
        text:
          `Published (test ${id}: ${what}, ${writingMinutes(test)} minutes). The learner sees the test card. Tell them in one or two sentences that it is ready and how long it takes.` +
          (issues.length ? `\nWarnings to consider next time:\n${formatIssues(issues)}` : ""),
      };
    },
  });

  return [writingPublish];
}
