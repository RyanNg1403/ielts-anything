import { z } from "zod";
import { defineTool } from "./registry.ts";

const option = z.object({
  label: z.string().describe("Short choice text, 1-6 words."),
  description: z.string().optional().describe("One line explaining the choice."),
});

const question = z.object({
  id: z.string().describe("Stable key for the answer, e.g. 'level' or 'passages'."),
  header: z.string().max(24).describe("Very short chip label, e.g. 'Target band'."),
  question: z.string().describe("The full question, ending with a question mark."),
  options: z.array(option).min(2).max(5),
  multiSelect: z.boolean().default(false),
  allowOther: z.boolean().default(true).describe("Let the learner type a custom answer."),
});

export const askLearner = defineTool({
  name: "ask_learner",
  description:
    "Ask the learner 1-4 clarifying questions as an interactive form in the app. " +
    "Use this instead of asking in plain text whenever the answer is a choice (target band, skill, full test vs drill, " +
    "question types, difficulty, topic angle). The form is shown at once; the learner's answers arrive as their next message.",
  input: z.object({ questions: z.array(question).min(1).max(4) }),
  // Returns at once rather than waiting: Codex may cancel a tool call that waits on a person, which
  // left forms that could no longer be answered. The answers come back as the learner's next message.
  async run() {
    return { text: "The form is shown to the learner. Do not repeat the questions in chat. End your turn now; their answers will arrive as their next message." };
  },
});

export const showBrief = defineTool({
  name: "show_brief",
  description:
    "Show the learner the plan for the practice you are about to generate, as a card in the app, before generating it. " +
    "Call it once the topic and options are settled.",
  input: z.object({
    skill: z.enum(["reading", "listening", "writing", "speaking"]),
    mode: z.enum(["full", "drill"]),
    title: z.string().describe("Working title of the practice set."),
    topic: z.string().describe("The learner's topic in one sentence."),
    outline: z.array(z.string()).min(1).max(6).describe("One line per passage/part/task, in order, saying what it covers. Do not prefix lines with 'Passage 1:' etc.; the app numbers them."),
    questionTypes: z.array(z.string()).default([]).describe("Question families to include, if relevant."),
    estimatedMinutes: z.number().int().positive(),
  }),
  async run(brief, ctx) {
    ctx.emit({ type: "card", card: { kind: "brief", ...brief } });
    return { text: "Brief shown to the learner." };
  },
});
