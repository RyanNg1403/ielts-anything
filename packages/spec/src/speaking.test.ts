import { describe, expect, it } from "vitest";
import { speakingOverall, speakingTestSchema, toSpeakingCandidate, validateSpeaking, type SpeakingTest } from "./index.ts";

const full: SpeakingTest = speakingTestSchema.parse({
  kind: "speaking",
  mode: "full",
  title: "Walking and the theatre",
  topic: "walking",
  part1: {
    frames: [
      { topic: "Work or studies", questions: ["Do you work or are you a student?", "What do you like about your studies?", "Is there anything you would like to change about them?"] },
      { topic: "Walking", questions: ["How much walking do you do in your daily life?", "Did you walk more when you were at school than now?", "What places are there to go for a walk near where you live?", "Would you ever like to go on a walking holiday?"] },
    ],
  },
  part2: {
    task: "Describe a play or a film you have seen that you would like to see again with friends.",
    prompts: ["what play or film you'd like to see again", "who you would go with", "what other people have said about it"],
    explain: "and explain why you would like to see this play or film again with friends.",
    roundingOff: ["Do you often go to the cinema with friends?"],
  },
  part3: {
    themes: [
      { topic: "Going to the theatre", questions: ["What are the most popular kinds of plays or shows in your country?", "How easy is it to get tickets to the theatre?", "Do you think theatres need to do more to attract younger audiences?"] },
      { topic: "Working as an actor", questions: ["What do you think attracts people to working as an actor?", "What qualities does a person need to become an actor?", "Can you think of any disadvantages of working as an actor?"] },
    ],
  },
});

describe("speaking", () => {
  it("accepts a Cambridge-shaped full test", () => {
    expect(validateSpeaking(full).filter((i) => i.level === "error")).toEqual([]);
  });

  it("rejects a cue card that is a question and prompts that are questions", () => {
    const bad = { ...full, part2: { ...full.part2!, task: "What film would you see again?", prompts: ["what is it?", "who", "when"], explain: "why you liked it" } };
    const errors = validateSpeaking(bad).filter((i) => i.level === "error").map((i) => i.message);
    expect(errors.some((m) => m.includes('starts with "Describe"'))).toBe(true);
    expect(errors.some((m) => m.includes("not a question"))).toBe(true);
    expect(errors.some((m) => m.includes('"and explain"'))).toBe(true);
    expect(errors.some((m) => m.includes("remove the"))).toBe(true);
  });

  it("checks the parts match the mode", () => {
    expect(validateSpeaking({ ...full, mode: "drill" }).some((i) => i.message.includes("exactly one part"))).toBe(true);
    expect(validateSpeaking({ ...full, part3: null }).some((i) => i.message.includes("Parts 1, 2 and 3"))).toBe(true);
  });

  it("never shows questions to the candidate", () => {
    const view = JSON.stringify(toSpeakingCandidate(full));
    expect(view).not.toContain("walking holiday");
    expect(view).not.toContain("Describe");
    expect(toSpeakingCandidate(full)).toMatchObject({ parts: [1, 2, 3], minutes: 14 });
  });

  it("rounds the overall band like IELTS", () => {
    const b = (fluency: number, lexical: number, grammar: number, pronunciation: number) =>
      speakingOverall({ fluency: { band: fluency }, lexical: { band: lexical }, grammar: { band: grammar }, pronunciation: { band: pronunciation } } as any);
    expect(b(6, 6, 6, 7)).toBe(6.5); // 6.25 rounds up to 6.5
    expect(b(6, 7, 7, 7)).toBe(7); // 6.75 rounds up to 7
    expect(b(6, 6, 7, 7)).toBe(6.5);
    expect(b(7, 7, 7, 7)).toBe(7);
  });
});

describe("examiner's spoken bands", () => {
  it("reads digits and number words, in any order", async () => {
    const { parseSpokenBands } = await import("./index.ts");
    const said =
      "Assessment. Fluency and coherence: band seven. You kept going well. Lexical resource, band 6. " +
      "Grammatical range and accuracy: band six. Some errors. Pronunciation: band 7. Clear stress. Next steps: practise linking.";
    expect(parseSpokenBands(said)).toEqual({ fluency: 7, lexical: 6, grammar: 6, pronunciation: 7 });
  });
  it("reads the evidence-first format", async () => {
    const { parseSpokenBands } = await import("./index.ts");
    const said =
      "Assessment. Fluency and coherence. Evidence: long turns, linked with \"first of all\". Descriptor: fits band 7, \"able to keep going\"; not band 8, hesitation was to find words. " +
      "Fluency and coherence band 7. Lexical resource. Evidence: \"regulation framework\". Descriptor: band 8 needs skilful less common items. Lexical resource band seven. " +
      "Grammatical range and accuracy. Evidence: relative clauses; \"are going to coming\". Descriptor: band 7. Grammatical range and accuracy band 7. " +
      "Pronunciation. Evidence: like pronunciation band 6 speakers, \"development\" stressed on the first syllable. Descriptor: band 6 plus some band 8. Pronunciation band 8. Next steps: one. End of assessment.";
    expect(parseSpokenBands(said)).toEqual({ fluency: 7, lexical: 7, grammar: 7, pronunciation: 8 });
  });
  it("returns null when a criterion is missing", async () => {
    const { parseSpokenBands } = await import("./index.ts");
    expect(parseSpokenBands("Fluency and coherence: band 7. Lexical resource: band 6. Pronunciation: band 7.")).toBeNull();
  });
});
