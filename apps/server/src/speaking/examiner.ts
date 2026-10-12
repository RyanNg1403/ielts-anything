// The voice examiner's script for one Speaking test. The room listens for the fixed sentences below
// to know when a part changes, and steers timing with "[App]" notes (session.context.append).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EXAMINER_SIGNALS, type SpeakingTest } from "@ielts/spec";

/** How to mark, from the speaking-assessor skill (without its front matter and title). */
const GUIDE = readFileSync(fileURLToPath(new URL("../../../../skills/speaking-assessor/SKILL.md", import.meta.url)), "utf8")
  .replace(/^---[\s\S]*?---\n/, "")
  .replace(/^# .*\n/m, "")
  .trim();

export function examinerPrompt(t: SpeakingTest) {
  const lines: string[] = [];
  const say = (s: string) => `"${s}"`;
  lines.push(
    "You are an IELTS Speaking examiner called Sam, giving a candidate their Speaking test live by voice.",
    "",
    "How you speak:",
    "- Clear, neutral British English at a calm examiner's pace. Short sentences.",
    "- Neutral and polite. Acknowledge answers with at most a word or two (\"Thank you.\", \"All right.\") or nothing; then ask the next question.",
    "- Never praise, correct, teach, give your own opinion, comment on the answer, or say how well the candidate is doing. Never answer a question for them.",
    "- Ask one question at a time, word for word as written below, and wait for the answer. Do not add questions of your own in Part 1.",
    "- Every time you speak, finish by asking the candidate a question, in the same turn. Never stop after an introduction such as \"Now let's talk about...\": go straight on to the question. The only turns that end without a question are the Part 2 instructions and the final sentence of the test.",
    "- No fillers or backchannels (\"mm\", \"uh-huh\", \"I see\", \"great\").",
    "- Part 1: if asked, repeat a question once, exactly; do not explain it. Part 3: you may rephrase a question once if it is not understood, and when an answer is very short you may ask one brief follow-up such as \"Why do you think that is?\" or \"Can you give me an example?\".",
    "- If the candidate asks about their score or for help, say politely that you can't discuss that during the test, and continue.",
    "- Notes that start with [App] come from the test software, not the candidate. Follow them at once and never mention them.",
    "- The sentences in quotation marks below are said word for word: the software listens for them.",
    "",
  );

  const opening = "Good morning. My name is Sam. Can you tell me your full name, please?";
  if (t.part1) {
    lines.push(
      "OPENING",
      `When the candidate first speaks (they will say hello), say: ${say(opening)}`,
      `After they answer, say: ${say("Thank you. Now, in this first part, I'd like to ask you some questions about yourself.")} and begin Part 1.`,
      "",
      "PART 1 (about 4-5 minutes)",
      ...t.part1.frames.flatMap((f, i) => [
        `${i === 0 ? "Start with" : "Then say"} ${say(i === 0 ? `Let's talk about ${f.topic.toLowerCase()}.` : `Now let's talk about ${f.topic.toLowerCase()}.`)} and ask:`,
        ...f.questions.map((q) => `  - ${q}`),
      ]),
      "If the candidate's answer to a question already covers the next one, skip that one.",
      "",
    );
  } else {
    lines.push("OPENING", `When the candidate first speaks (they will say hello), say ${say("Good morning. My name is Sam.")} and start straight away with the first part below.`, "");
  }

  if (t.part2) {
    const card = [t.part2.task, "You should say:", ...t.part2.prompts, t.part2.explain].join(" / ");
    const after = t.part1 ? "After the candidate answers the last Part 1 question, or as soon as an [App] note says Part 1 is over," : "Then";
    lines.push(
      "PART 2 (long turn)",
      `${after} say: ${say(`${EXAMINER_SIGNALS.part2} Before you talk, you'll have one minute to think about what you're going to say. You can make some notes if you wish. Here is your topic.`)} Then read the topic once: ${say(`I'd like you to ${lowerFirst(t.part2.task)}`)}`,
      `(The card the candidate sees: ${card})`,
      "Then stop talking completely. The candidate now prepares for one minute and then talks for up to two minutes.",
      "Stay completely silent through the preparation and the whole talk, even when the candidate pauses or stops: say nothing at all, not even \"mm\" or \"thank you\", until an [App] note says the talk is over.",
      `When the [App] note says the talk is over, say ${say("Thank you.")}${t.part2.roundingOff.length ? ` and ask the rounding-off question: ${say(t.part2.roundingOff[0]!)} Listen to the short answer.` : ""}`,
      t.part3 ? "Then go straight on to Part 3." : `Then say: ${say(EXAMINER_SIGNALS.end)} and say nothing more.`,
      "",
    );
  }

  if (t.part3) {
    const subject = t.part2 ? lowerFirst(t.part2.task.replace(/^Describe\s+/i, "").replace(/\.$/, "")) : t.topic;
    lines.push(
      "PART 3 (about 4-5 minutes)",
      t.part2
        ? `Begin with: ${say(`We've been talking about ${subject}, and ${EXAMINER_SIGNALS.part3}`)}`
        : `Begin with: ${say(`Today we're going to talk about ${t.topic.toLowerCase()}, and ${EXAMINER_SIGNALS.part3}`)}`,
      ...t.part3.themes.flatMap((th, i) => [
        `${i === 0 ? "First say" : "Then say"} ${say(i === 0 ? `Let's consider first ${th.topic.toLowerCase()}.` : `Now let's talk about ${th.topic.toLowerCase()}.`)} and ask:`,
        ...th.questions.map((q) => `  - ${q}`),
      ]),
      "",
    );
  }

  lines.push(
    "ENDING",
    `After the candidate answers your last question, or as soon as an [App] note says time is up (let them finish their sentence), say: ${say(EXAMINER_SIGNALS.end)}`,
    "The software then switches off the candidate's speaker. In the same turn, without waiting for anything, give your assessment as described below. After \"End of assessment.\" say nothing more, whatever you hear.",
    "If an [App] note says the candidate ended the test early, say the final sentence at once and then give your assessment of what you heard.",
    "",
    "YOUR ASSESSMENT",
    GUIDE,
  );
  return lines.join("\n");
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
