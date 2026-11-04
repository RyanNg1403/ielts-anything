import { describe, expect, it } from "vitest";
import {
  listeningAnswerKey,
  listeningBand,
  listeningCandidateText,
  listeningInstructionsFor,
  listeningPartSchema,
  listeningTestSchema,
  markListening,
  narratePart,
  SAMPLE_LISTENING,
  sectionQuestions,
  toListeningCandidate,
  validateListeningPart,
  validateListeningTest,
} from "./index.ts";

const sections = [
  {
    lines: [
      { speaker: "receptionist", text: "Good morning, Riverside Sports Centre. How can I help you?" },
      { speaker: "caller", text: "Hi, I'd like to book a place on the beginners' climbing course, please." },
      { speaker: "receptionist", text: "Of course. Can I take your surname first?" },
      { speaker: "caller", text: "Yes, it's Fitzgerald. That's F, I, T, Z, G, E, R, A, L, D." },
      { speaker: "receptionist", text: "Thank you. And how did you hear about the course?" },
      { speaker: "caller", text: "A friend told me, actually. Well, no, I saw it in the local newspaper first, and then my friend mentioned it." },
    ],
  },
  {
    lines: [
      { speaker: "receptionist", text: "Right. The course costs forty-two pounds a month, and the sessions are on Tuesday evenings." },
      { speaker: "caller", text: "Oh, I was hoping for Thursdays. Is that possible?" },
      { speaker: "receptionist", text: "We do run a Thursday group, so I'll put you down for that one. You'll need to bring trainers, and we provide the harness." },
      { speaker: "caller", text: "Great, thank you very much." },
    ],
  },
];

const form = {
  family: "form_completion",
  wordLimit: { maxWords: 1, allowNumber: true },
  title: "Climbing course booking",
  fields: [
    { label: "Course", value: "Beginners" },
    { label: "Surname", value: "{{1}}" },
    { label: "Heard about it from", value: "local {{2}}" },
    { label: "Cost", value: "£{{3}} a month" },
    { label: "Day", value: "{{4}}" },
    { label: "Bring", value: "{{5}}" },
  ],
  items: [
    { q: 1, answer: "Fitzgerald", alternatives: [], evidence: "it's Fitzgerald", explanation: "" },
    { q: 2, answer: "newspaper", alternatives: [], evidence: "I saw it in the local newspaper first", explanation: "" },
    { q: 3, answer: "forty-two", alternatives: ["42"], evidence: "The course costs forty-two pounds a month", explanation: "" },
    { q: 4, answer: "Thursday", alternatives: [], evidence: "I'll put you down for that one", explanation: "" },
    { q: 5, answer: "trainers", alternatives: [], evidence: "You'll need to bring trainers", explanation: "" },
  ],
};

function part(overrides: Record<string, unknown> = {}) {
  return listeningPartSchema.parse({
    number: 1,
    title: "Climbing course",
    context: "You will hear a man phoning a sports centre about a climbing course.",
    speakers: [
      { id: "receptionist", role: "Receptionist", sex: "female", accent: "british" },
      { id: "caller", role: "Caller", sex: "male", accent: "american" },
    ],
    sections,
    blocks: [form],
    ...overrides,
  });
}

const errors = (p: ReturnType<typeof part>) => validateListeningPart(p).filter((i) => i.level === "error");

describe("validateListeningPart", () => {
  it("rejects evidence that does not contain the answer, or an answer never said", () => {
    expect(errors(part()).map((e) => e.message).join("\n")).toContain('the evidence quote must contain the answer "Thursday"');
    const unsaid = structuredClone(form);
    unsaid.items[4]!.answer = "boots";
    expect(errors(part({ blocks: [unsaid] })).map((e) => e.message).join("\n")).toContain('the answer "boots" must be said');
    const ok = structuredClone(form);
    ok.items[3] = { q: 4, answer: "Thursday", alternatives: [], evidence: "We do run a Thursday group", explanation: "" };
    expect(errors(part({ blocks: [ok] }))).toEqual([]);
  });

  it("requires answers in the order they are heard", () => {
    const swapped = structuredClone(form);
    swapped.items[3] = { q: 4, answer: "Thursday", alternatives: [], evidence: "We do run a Thursday group", explanation: "" };
    [swapped.items[0]!.evidence, swapped.items[1]!.evidence] = [swapped.items[1]!.evidence, swapped.items[0]!.evidence];
    [swapped.items[0]!.answer, swapped.items[1]!.answer] = ["newspaper", "Fitzgerald"];
    expect(errors(part({ blocks: [swapped] })).some((e) => e.message.includes("question order"))).toBe(true);
  });

  it("checks the speakers suit the part", () => {
    const lecture = part({ number: 4 });
    const msgs = errors(lecture).map((e) => e.message);
    expect(msgs).toContain("Part 4 is a lecture or talk by one speaker.");
    expect(msgs).toContain("Part 4 runs as one section with no break.");
  });

  it("keeps the places asked about unlabelled on a map", () => {
    const map = {
      family: "map_labelling",
      kind: "map",
      title: "Riverside Sports Centre",
      compass: true,
      features: [
        { kind: "building", label: "Reception", box: [40, 50, 20, 12], points: [] },
        { kind: "building", label: "Climbing wall", box: [10, 10, 20, 12], points: [] },
        { kind: "road", label: "Mill Lane", box: [], points: [[0, 68], [100, 68]] },
        { kind: "area", label: "Car park", box: [70, 10, 20, 15], points: [] },
      ],
      markers: ["A", "B", "C", "D", "E"].map((letter, i) => ({ letter, x: 10 + i * 18, y: 40 })),
      items: [
        { q: 1, label: "Climbing wall", answer: "A", evidence: "it's Fitzgerald", explanation: "" },
        { q: 2, label: "Café", answer: "B", evidence: "local newspaper", explanation: "" },
        { q: 3, label: "Shop", answer: "C", evidence: "forty-two pounds", explanation: "" },
      ],
    };
    const msgs = errors(part({ blocks: [map] })).map((e) => e.message).join("\n");
    expect(msgs).toContain('"Climbing wall" is printed on the map');
  });
});

describe("narration and marking", () => {
  const fixed = structuredClone(form);
  fixed.items[3] = { q: 4, answer: "Thursday", alternatives: [], evidence: "We do run a Thursday group", explanation: "" };
  const test = listeningTestSchema.parse({ kind: "listening", mode: "drill", title: "t", topic: "t", parts: [part({ blocks: [fixed] })] });

  it("previews each section's questions before it plays", () => {
    expect(validateListeningTest(test).filter((i) => i.level === "error")).toEqual([]);
    expect(sectionQuestions(test.parts[0]!)).toEqual([[1, 2], [3, 4, 5]]);
    const said = narratePart(test, 0).flatMap((s) => (s.kind === "say" && s.voice === "narrator" ? [s.text] : []));
    expect(said[0]).toBe("Part 1. You will hear a man phoning a sports centre about a climbing course.");
    expect(said).toContain("First, you have some time to look at questions 1 to 2.");
    expect(said).toContain("Before you hear the rest of the conversation, you have some time to look at questions 3 to 5.");
    expect(said.at(-1)).toBe("That is the end of Part 1.");
  });

  it("prints Listening instructions", () => {
    const ins = listeningInstructionsFor(test.parts[0]!.blocks[0]!);
    expect(ins).toEqual({ heading: "Questions 1–5", lines: ["Complete the form below.", "Write ONE WORD AND/OR A NUMBER for each answer."] });
  });

  it("marks answers with accepted alternatives and word limits", () => {
    const r = markListening(test, { 1: "fitzgerald", 2: "newspapers", 3: "42", 4: "Thursday.", 5: "" });
    expect(r.items.map((i) => i.correct)).toEqual([true, false, true, true, false]);
    expect(r.band).toBeNull();
    expect(listeningAnswerKey(test)).toHaveLength(5);
  });

  it("hides the script and answers from the candidate", () => {
    const c = JSON.stringify(toListeningCandidate(test));
    expect(c).not.toContain("Fitzgerald");
    expect(c).not.toContain("sections");
    expect(listeningCandidateText(test)).toContain("Receptionist: Good morning");
  });

  it("accepts the sample drill", () => {
    expect(validateListeningTest(listeningTestSchema.parse(SAMPLE_LISTENING))).toEqual([]);
  });

  it("converts raw scores to approximate bands", () => {
    expect(listeningBand(40)).toBe(9);
    expect(listeningBand(32)).toBe(7.5);
    expect(listeningBand(26)).toBe(6.5);
    expect(listeningBand(9)).toBeNull();
  });
});
