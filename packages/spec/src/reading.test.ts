import { describe, expect, it } from "vitest";
import { answerKey, candidateText, fitsLimit, instructionsFor, markReading, passageSchema, readingBand, readingTestSchema, toCandidate, validatePassage } from "./index.ts";

const paragraphs = [
  "In 1858 the engineer Joseph Bazalgette proposed a network of intercepting sewers for London, a scheme that many officials initially dismissed as too expensive.",
  "The summer of that year, later called the Great Stink, changed opinion quickly. Parliament approved the plan within weeks, and construction began in 1859.",
  "Bazalgette insisted that the pipes be built far larger than the population of the time required. He reasoned that the city would continue to grow for decades.",
  "Critics argued that the money would be better spent on clean water supplies, yet cholera deaths fell sharply once the system was completed in 1875.",
  "Today historians regard the network as one of the most important public health achievements of the Victorian era, although its maintenance costs remain high.",
];

function basePassage(blocks: unknown[]) {
  return passageSchema.parse({ title: "The Great Stink", genre: "historical", paragraphs, blocks });
}

const tfng = {
  family: "tfng",
  items: [
    { q: 1, statement: "Officials welcomed the proposal at first.", answer: "FALSE", evidence: "a scheme that many officials initially dismissed as too expensive", explanation: "They dismissed it." },
    { q: 2, statement: "Construction started in 1859.", answer: "TRUE", evidence: "construction began in 1859", explanation: "Stated." },
    { q: 3, statement: "Bazalgette was paid a large salary.", answer: "NOT GIVEN", evidence: "", explanation: "No information." },
  ],
};

const sentence = {
  family: "sentence_completion",
  wordLimit: { maxWords: 3, allowNumber: false },
  items: [
    { q: 4, sentence: "Bazalgette built the pipes larger because he expected the city to ____.", answer: "continue to grow", alternatives: [], evidence: "He reasoned that the city would continue to grow for decades", explanation: "" },
    { q: 5, sentence: "Critics preferred spending on ____.", answer: "clean water", alternatives: [], evidence: "would be better spent on clean water supplies", explanation: "" },
    { q: 6, sentence: "Today the network still has high ____.", answer: "maintenance costs", alternatives: [], evidence: "although its maintenance costs remain high", explanation: "" },
  ],
};

describe("validatePassage", () => {
  it("accepts a well-formed passage", () => {
    const p = basePassage([tfng]);
    expect(validatePassage(p, 1).filter((i) => i.level === "error")).toEqual([]);
  });

  it("rejects evidence that is not in the passage", () => {
    const bad = structuredClone(tfng);
    bad.items[1]!.evidence = "building work started in 1859";
    const errors = validatePassage(basePassage([bad]), 1).filter((i) => i.level === "error");
    expect(errors.some((e) => e.message.includes("not in the passage"))).toBe(true);
  });

  it("rejects TFNG statements out of passage order", () => {
    const bad = structuredClone(tfng);
    [bad.items[0]!.evidence, bad.items[1]!.evidence] = [bad.items[1]!.evidence, bad.items[0]!.evidence];
    const errors = validatePassage(basePassage([bad]), 1).filter((i) => i.level === "error");
    expect(errors.some((e) => e.message.includes("passage order"))).toBe(true);
  });

  it("rejects answers over the word limit and answers not in the text", () => {
    const over = structuredClone(sentence);
    over.items[0]!.answer = "continue to grow for decades";
    over.items[0]!.evidence = "the city would continue to grow for decades";
    const errors = validatePassage(basePassage([tfng, over]), 1).filter((i) => i.level === "error");
    expect(errors.some((e) => e.message.includes("word limit"))).toBe(true);
  });

  it("checks matching-information evidence sits in the keyed paragraph", () => {
    const block = {
      family: "matching_information",
      allowReuse: false,
      items: [
        { q: 1, prompt: "the year the system was finished", answer: "C", evidence: "once the system was completed in 1875", explanation: "" },
        { q: 2, prompt: "a modern assessment", answer: "E", evidence: "historians regard the network as one of the most important public health achievements", explanation: "" },
        { q: 3, prompt: "a reason for oversizing", answer: "C", evidence: "He reasoned that the city would continue to grow for decades", explanation: "" },
      ],
    };
    const errors = validatePassage(basePassage([block]), 1).filter((i) => i.level === "error");
    expect(errors.map((e) => e.message).join("\n")).toContain("evidence is in paragraph D");
    expect(errors.map((e) => e.message).join("\n")).toContain("used twice");
  });
});

describe("word limits", () => {
  it("counts hyphenated compounds as one word and numbers separately", () => {
    expect(fitsLimit("well-known engineer", { maxWords: 2, allowNumber: false })).toBe(true);
    expect(fitsLimit("1875", { maxWords: 1, allowNumber: false })).toBe(false);
    expect(fitsLimit("1875", { maxWords: 1, allowNumber: true })).toBe(true);
    expect(fitsLimit("two large pipes", { maxWords: 2, allowNumber: true })).toBe(false);
  });
});

describe("instructions", () => {
  it("renders Cambridge wording", () => {
    const p = basePassage([tfng, sentence]);
    const t = instructionsFor(p.blocks[0]!, p, 1);
    expect(t.heading).toBe("Questions 1–3");
    expect(t.lines[0]).toBe("Do the following statements agree with the information given in Reading Passage 1?");
    expect(instructionsFor(p.blocks[1]!, p, 1).lines[1]).toBe("Choose NO MORE THAN THREE WORDS from the passage for each answer.");
  });
});

describe("marking", () => {
  const test = readingTestSchema.parse({ kind: "reading", mode: "drill", title: "t", topic: "t", passages: [basePassage([tfng, sentence])] });

  it("marks labels and extracted answers, case-insensitively, within limits", () => {
    const r = markReading(test, { 1: "FALSE", 2: "NOT GIVEN", 3: "NOT GIVEN", 4: "Continue to grow.", 5: "clean water supplies", 6: "" });
    expect(r.items.map((i) => i.correct)).toEqual([true, false, true, true, false, false]);
    expect(r.raw).toBe(3);
    expect(r.band).toBeNull();
  });

  it("marks choose-two groups in any order without double counting", () => {
    const multi = basePassage([
      {
        family: "mcq_multi",
        qs: [1, 2],
        stem: "Which TWO facts are stated?",
        options: ["A", "B", "C", "D", "E"].map((letter) => ({ letter, text: letter })),
        answers: ["B", "D"],
        evidence: ["construction began in 1859", "cholera deaths fell sharply"],
        explanation: "",
      },
    ]);
    const t = readingTestSchema.parse({ kind: "reading", mode: "drill", title: "t", topic: "t", passages: [multi] });
    expect(markReading(t, { 1: "D", 2: "B" }).raw).toBe(2);
    expect(markReading(t, { 1: "B", 2: "B" }).raw).toBe(1);
  });

  it("converts raw scores to approximate bands", () => {
    expect(readingBand(40)).toBe(9);
    expect(readingBand(30)).toBe(7);
    expect(readingBand(23)).toBe(6);
    expect(readingBand(4)).toBeNull();
  });

  it("hides answers from the candidate view", () => {
    const c = JSON.stringify(toCandidate(test));
    expect(c).not.toContain("continue to grow\"");
    expect(c).not.toContain("evidence");
    expect(candidateText(test)).toContain("Questions 1–3");
    expect(answerKey(test)).toHaveLength(6);
  });
});

describe("stripParagraphLabels", () => {
  it("removes a typed letter that matches the paragraph's position, and nothing else", async () => {
    const { stripParagraphLabels } = await import("./reading.ts");
    const p = { title: "t", paragraphs: ["A. By early October.", "(B) Then.", "A study found.", "D: Finally."] } as any;
    expect(stripParagraphLabels(p).paragraphs).toEqual(["By early October.", "Then.", "A study found.", "Finally."]);
  });
});
