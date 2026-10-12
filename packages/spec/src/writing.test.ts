import { describe, expect, it } from "vitest";
import { SAMPLE_TASK1 } from "./writing-samples.ts";
import { roundBand, task1Family, type Figure, type TaskMark, validateWriting, writingOverall, writingTestSchema, writingWordCount, type Task1, type WritingTest } from "./writing.ts";

const drill = (task1: Task1): WritingTest => ({ kind: "writing", mode: "drill", title: "t", topic: "t", task1, task2: null });
const errors = (t: WritingTest) => validateWriting(t).filter((i) => i.level === "error").map((i) => i.message);
const clone = <T,>(x: T): T => structuredClone(x);
const first = <K extends Figure["kind"]>(t: Task1, kind: K) => t.figures[0] as Extract<Figure, { kind: K }>;

describe("Task 1 samples", () => {
  for (const [name, task1] of Object.entries(SAMPLE_TASK1))
    it(`${name} parses and passes every check`, () => {
      const t = writingTestSchema.parse(drill(task1));
      expect(validateWriting(t)).toEqual([]);
    });

  it("classes a mixed task by its parts", () => {
    expect(task1Family(SAMPLE_TASK1.mixed)).toBe("mixed:bar+table");
    expect(task1Family(SAMPLE_TASK1.map)).toBe("map");
  });
});

describe("validateWriting", () => {
  it("rejects a pie that does not add up to 100", () => {
    const t: Task1 = clone(SAMPLE_TASK1.pie);
    first(t, "pie").pies[0]!.slices[0]!.percent = 60;
    expect(errors(drill(t))).toContainEqual(expect.stringContaining("adds up to 92%"));
  });

  it("rejects a series with the wrong number of values", () => {
    const t: Task1 = clone(SAMPLE_TASK1.line);
    first(t, "line").series[0]!.values.pop();
    expect(errors(drill(t))).toContainEqual(expect.stringContaining('"Norway" has 6 values for 7'));
  });

  it("rejects overlapping buildings and identical plans", () => {
    const t: Task1 = clone(SAMPLE_TASK1.map);
    const map = first(t, "map");
    map.states[0]!.features[4]!.box = [20, 8, 14, 9];
    map.states[1] = clone(map.states[0]!);
    const e = errors(drill(t));
    expect(e).toContainEqual(expect.stringContaining('"Post office" and "Shops" overlap'));
    expect(e).toContainEqual(expect.stringContaining("plans are identical"));
  });

  it("rejects an arrow to a missing stage", () => {
    const t: Task1 = clone(SAMPLE_TASK1.process);
    first(t, "process").arrows[0]!.to = "s9";
    expect(errors(drill(t))).toContainEqual(expect.stringContaining("s1 -> s9"));
  });

  it("does not mix a map with a chart", () => {
    const t: Task1 = clone(SAMPLE_TASK1.map);
    t.figures.push(SAMPLE_TASK1.bar.figures[0]!);
    expect(errors(drill(t))).toContainEqual(expect.stringContaining("stand alone"));
  });

  it("needs both tasks in a full test", () => {
    expect(errors({ ...drill(SAMPLE_TASK1.bar), mode: "full" })).toContainEqual(expect.stringContaining("Task 1 and Task 2"));
  });

  it("checks Task 2 wording against its family", () => {
    const t: WritingTest = {
      kind: "writing",
      mode: "drill",
      title: "t",
      topic: "t",
      task1: null,
      task2: { family: "two-part", statement: "More people now work from home.", questions: ["Why is this happening?"], obligations: ["explain why"] },
    };
    expect(errors(t)).toContainEqual(expect.stringContaining("two questions"));
  });
});

it("counts words as IELTS does", () => {
  expect(writingWordCount("In 2010, well-known firms grew by 5% - fast.")).toBe(8);
});

describe("Writing bands", () => {
  const mark = (b: number[]): TaskMark => ({
    task: { band: b[0]!, evidence: "", descriptor: "", check: "" },
    coherence: { band: b[1]!, evidence: "", descriptor: "", check: "" },
    lexical: { band: b[2]!, evidence: "", descriptor: "", check: "" },
    grammar: { band: b[3]!, evidence: "", descriptor: "", check: "" },
    corrections: [],
    nextSteps: "",
  });
  it("rounds to the nearest half band", () => {
    expect([6.125, 6.25, 6.6, 6.75].map(roundBand)).toEqual([6, 6.5, 6.5, 7]);
  });
  it("counts Task 2 twice", () => {
    // Task 1 mean 5, Task 2 mean 7: (5 + 14) / 3 = 6.33 -> 6.5
    expect(writingOverall({ "1": { ...mark([5, 5, 5, 5]), words: 160, band: 5 }, "2": { ...mark([7, 7, 7, 7]), words: 270, band: 7 } })).toBe(6.5);
    expect(writingOverall({ "2": { ...mark([6, 7, 7, 6]), words: 270, band: 6.5 } })).toBe(6.5);
  });
});
