// IELTS Academic Writing: the test format (Cambridge 12-21 layout), the Task 1 figures the app
// draws from data, and the checks a generated test must pass. Measured densities come from
// research/ielts/writing-types/ (Cambridge 12-20 Task 1 pages).
import { z } from "zod";
import type { Issue } from "./validate.ts";

const title = z.string().min(3).describe("Short heading printed above the figure, e.g. 'Percentage of the population living in cities'.");
const values = z.array(z.number()).describe("One number per point or category, in the same order.");

export const lineFigureSchema = z.object({
  kind: z.literal("line"),
  title,
  xLabel: z.string().describe("Horizontal axis title, usually 'Year' or 'Month'."),
  points: z.array(z.string()).min(4).max(12).describe("Time labels along the horizontal axis, in order, e.g. ['1970', '1980', ...]."),
  yLabel: z.string().describe("Vertical axis title with its unit, e.g. 'Percentage (%) of total population'."),
  series: z.array(z.object({ name: z.string(), values })).min(2).max(5),
});

export const barFigureSchema = z.object({
  kind: z.literal("bar"),
  title,
  orientation: z.enum(["vertical", "horizontal"]),
  categories: z.array(z.string()).min(2).max(10).describe("Bar groups: categories, places or years."),
  categoryLabel: z.string().describe("Axis title for the categories, or '' when the labels speak for themselves."),
  valueLabel: z.string().describe("Axis title for the values with their unit, e.g. 'Billion kWh'."),
  series: z.array(z.object({ name: z.string(), values })).min(1).max(5).describe("One series per bar in each group; one series means a simple bar chart."),
});

export const pieFigureSchema = z.object({
  kind: z.literal("pie"),
  title,
  pies: z
    .array(
      z.object({
        label: z.string().describe("Heading over this pie, e.g. '1990' or 'Fast food meal'."),
        slices: z.array(z.object({ name: z.string(), percent: z.number() })).min(3).max(8).describe("Shares in percent; they add up to 100."),
      }),
    )
    .min(1)
    .max(4)
    .describe("Several pies compare groups or years and use the same slice names."),
});

export const tableFigureSchema = z.object({
  kind: z.literal("table"),
  title,
  rowHeader: z.string().describe("Heading of the first column, which holds the row labels."),
  columns: z.array(z.string()).min(2).max(6).describe("Data column headings, with units where needed, e.g. 'Exports ($ billion)'."),
  rows: z.array(z.object({ label: z.string(), cells: z.array(z.string()) })).min(2).max(8).describe("Each row has one cell per data column, written as printed, e.g. '12.5' or '+3%'."),
});

const stage = z.object({
  id: z.string().describe("Short id used by the arrows, e.g. 's1'."),
  label: z.string().describe("What happens at this stage, as printed beside it, e.g. 'Crushing' or 'Heating pellets to form raw material'."),
});

export const processFigureSchema = z.object({
  kind: z.literal("process"),
  title,
  numbered: z.boolean().describe("true prints a stage number beside each stage, as most Cambridge process diagrams do."),
  stages: z.array(stage).min(5).max(10).describe("Stages in the order they happen. Parallel routes list each route's stages one after the other."),
  arrows: z
    .array(z.object({ from: z.string(), to: z.string(), label: z.string().describe("Text on the arrow, e.g. 'Washing', or ''.") }))
    .min(4)
    .describe("Every link between stages. A cycle ends with an arrow from the last stage back to the first."),
});

const featureKind = z.enum(["building", "area", "trees", "water", "road", "path"]);

export const mapFigureSchema = z.object({
  kind: z.literal("map"),
  title,
  compass: z.boolean().describe("true draws a north arrow, as most Cambridge plans do."),
  states: z
    .array(
      z.object({
        label: z.string().describe("Heading over this plan, e.g. 'Porth Harbour (in 2000)'."),
        features: z
          .array(
            z.object({
              kind: featureKind.describe(
                "building = labelled box; area = open land with a dashed edge (car park, sports field); trees = woodland or park; water = sea, lake or river; road and path = lines through 'points'.",
              ),
              label: z.string().describe("Text printed on the feature, e.g. 'Car park'. '' for unlabelled water or trees."),
              box: z
                .array(z.number())
                .describe("For building, area, trees and water: [x, y, width, height] on a 100 x 70 grid, origin top left, north up. [] for roads and paths."),
              points: z.array(z.array(z.number())).describe("For road and path: the line's [x, y] points on the same grid. [] for everything else."),
            }),
          )
          .min(4)
          .max(24),
      }),
    )
    .min(2)
    .max(3)
    .describe("The same site at two (rarely three) times, or now and as planned. Unchanged features keep the same box."),
});

export const figureSchema = z.discriminatedUnion("kind", [lineFigureSchema, barFigureSchema, pieFigureSchema, tableFigureSchema, processFigureSchema, mapFigureSchema]);
export type Figure = z.infer<typeof figureSchema>;
export type LineFigure = z.infer<typeof lineFigureSchema>;
export type BarFigure = z.infer<typeof barFigureSchema>;
export type PieFigure = z.infer<typeof pieFigureSchema>;
export type TableFigure = z.infer<typeof tableFigureSchema>;
export type ProcessFigure = z.infer<typeof processFigureSchema>;
export type MapFigure = z.infer<typeof mapFigureSchema>;
export type MapFeature = MapFigure["states"][number]["features"][number];
export const MAP_GRID = { width: 100, height: 70 };

export type Rect = { x: number; y: number; w: number; h: number };
/** A map feature's [x, y, width, height], or null when it has none. */
export function rect(box: number[]): Rect | null {
  const [x, y, w, h] = box;
  return box.length === 4 ? { x: x!, y: y!, w: w!, h: h! } : null;
}

export const task1Schema = z.object({
  intro: z
    .string()
    .describe("The first bold line of the task, e.g. 'The graph below gives information about ... from 1970 to 2020.' Starts with 'The', says 'below', names what, where and when."),
  figures: z.array(figureSchema).min(1).max(3).describe("One figure, or two or three related figures (a 'mixed' task, e.g. a bar chart and a table)."),
});

export const TASK2_FAMILIES = ["opinion", "discussion", "problem-solution", "advantages-disadvantages", "outweigh", "positive-negative", "two-part", "hybrid"] as const;

export const task2Schema = z.object({
  family: z.enum(TASK2_FAMILIES).describe("Cambridge 12-21 frequency: discussion 11, opinion 10, outweigh 6, hybrid 5, positive-negative 3, two-part 3, problem-solution 1, advantages-disadvantages 1."),
  statement: z.string().describe("The premise the candidate responds to, one to three sentences, e.g. 'Some people believe that ...'."),
  questions: z
    .array(z.string())
    .min(1)
    .max(2)
    .describe("What the candidate must do, as printed: e.g. ['To what extent do you agree or disagree?'] or ['Discuss both these views and give your own opinion.'] or two direct questions."),
  obligations: z.array(z.string()).min(1).max(4).describe("For the marker: each thing a full answer must do, e.g. 'explain why people choose X', 'state a clear position'."),
});

export const writingTestSchema = z.object({
  kind: z.literal("writing"),
  mode: z.enum(["full", "drill"]).describe("full = Task 1 and Task 2 in 60 minutes; drill = one task."),
  title: z.string(),
  topic: z.string(),
  task1: task1Schema.nullable(),
  task2: task2Schema.nullable(),
});

export type Task1 = z.infer<typeof task1Schema>;
export type Task2 = z.infer<typeof task2Schema>;
export type WritingTest = z.infer<typeof writingTestSchema>;
export type WritingTaskNumber = 1 | 2;

/** The printed wording around each task, word for word from the Cambridge papers. */
export const WRITING_WRAPPER = {
  1: {
    time: "You should spend about 20 minutes on this task.",
    directive: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    length: "Write at least 150 words.",
  },
  2: {
    time: "You should spend about 40 minutes on this task.",
    lead: "Write about the following topic:",
    directive: "Give reasons for your answer and include any relevant examples from your own knowledge or experience.",
    length: "Write at least 250 words.",
  },
} as const;
export const WRITING_TASK_MINUTES: Record<WritingTaskNumber, number> = { 1: 20, 2: 40 };
export const WRITING_MIN_WORDS: Record<WritingTaskNumber, number> = { 1: 150, 2: 250 };

export function writingTasks(t: Pick<WritingTest, "task1" | "task2">): WritingTaskNumber[] {
  return ([1, 2] as const).filter((n) => t[`task${n}`] !== null);
}

export function writingMinutes(t: Pick<WritingTest, "task1" | "task2">) {
  return writingTasks(t).reduce((m, n) => m + WRITING_TASK_MINUTES[n], 0);
}

/** How Task 1 is classed, e.g. 'map' or 'mixed:bar+table'. */
export function task1Family(t: Task1) {
  return t.figures.length === 1 ? t.figures[0]!.kind : `mixed:${t.figures.map((f) => f.kind).join("+")}`;
}

/** Words as IELTS counts them: anything between spaces, so numbers and hyphenated words count once. */
export function writingWordCount(text: string) {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

// ---- Checks ----

export function validateWriting(t: WritingTest): Issue[] {
  const issues: Issue[] = [];
  const err = (where: string, message: string) => issues.push({ level: "error", where, message });
  const warn = (where: string, message: string) => issues.push({ level: "warning", where, message });
  const tasks = writingTasks(t);

  if (tasks.length === 0) err("Test", "include at least one task.");
  if (t.mode === "full" && tasks.length !== 2) err("Test", "a full test has Task 1 and Task 2.");
  if (t.mode === "drill" && tasks.length !== 1) err("Test", "a drill has exactly one task.");

  if (t.task1) {
    const intro = t.task1.intro.trim();
    if (!/^The\b/.test(intro) || !/\bbelow\b/.test(intro)) err("Task 1", `the first line reads like "The chart below shows ...": "${intro}".`);
    if (t.task1.figures.filter((f) => f.kind === "map" || f.kind === "process").length && t.task1.figures.length > 1)
      err("Task 1", "maps and process diagrams stand alone; mix only line, bar, pie and table figures.");
    t.task1.figures.forEach((f, i) => checkFigure(f, t.task1!.figures.length > 1 ? `Task 1 figure ${i + 1}` : "Task 1", err, warn));
  }

  if (t.task2) {
    const q = t.task2;
    q.questions.forEach((s) => {
      if (!/[?.]$/.test(s.trim())) err("Task 2", `"${s}" must end with "?" or ".".`);
    });
    if (q.family === "discussion" && !q.questions.some((s) => /discuss both/i.test(s))) warn("Task 2", "a discussion prompt asks 'Discuss both these views and give your own opinion.'");
    if (q.family === "opinion" && !q.questions.some((s) => /agree or disagree/i.test(s))) warn("Task 2", "an opinion prompt asks 'To what extent do you agree or disagree?'");
    if (q.family === "outweigh" && !q.questions.some((s) => /outweigh/i.test(s))) warn("Task 2", "an outweigh prompt asks 'Do the advantages outweigh the disadvantages?'");
    if (["two-part", "hybrid"].includes(q.family) && q.questions.length < 2) err("Task 2", `a ${q.family} prompt has two questions.`);
    if (q.statement.split(/\s+/).length > 70) warn("Task 2", "the premise is long; Cambridge premises are one to three sentences.");
  }
  return issues;
}

type Report = (where: string, message: string) => void;

function checkFigure(f: Figure, where: string, err: Report, warn: Report) {
  const lengths = (series: { name: string; values: number[] }[], n: number, of: string) =>
    series.forEach((s) => {
      if (s.values.length !== n) err(where, `series "${s.name}" has ${s.values.length} values for ${n} ${of}.`);
    });
  const unique = (names: string[], of: string) => {
    if (new Set(names.map((n) => n.trim().toLowerCase())).size !== names.length) err(where, `${of} must have different names.`);
  };

  switch (f.kind) {
    case "line":
      lengths(f.series, f.points.length, "time points");
      unique(f.series.map((s) => s.name), "series");
      if (f.points.length < 5) warn(where, "Cambridge line graphs show 5-12 time points.");
      break;
    case "bar":
      lengths(f.series, f.categories.length, "categories");
      unique(f.categories, "categories");
      if (f.series.length > 1) unique(f.series.map((s) => s.name), "series");
      if (f.categories.length * f.series.length > 30) err(where, `${f.categories.length * f.series.length} bars is too many to read; keep it to 30 or fewer.`);
      if (f.series.some((s) => s.values.some((v) => v < 0))) err(where, "bars cannot be negative; use a line graph or table for changes.");
      break;
    case "pie":
      f.pies.forEach((p) => {
        const sum = p.slices.reduce((s, x) => s + x.percent, 0);
        if (Math.abs(sum - 100) > 0.5) err(where, `the "${p.label}" pie adds up to ${+sum.toFixed(1)}%, not 100%.`);
        if (p.slices.some((x) => x.percent <= 0)) err(where, `the "${p.label}" pie has an empty slice.`);
        unique(p.slices.map((x) => x.name), `slices of "${p.label}"`);
      });
      if (f.pies.length > 1) {
        const names = (p: PieFigure["pies"][number]) => p.slices.map((x) => x.name.toLowerCase()).sort().join("|");
        if (new Set(f.pies.map(names)).size > 1) warn(where, "pies that are compared usually share the same slices.");
      }
      break;
    case "table":
      f.rows.forEach((r) => {
        if (r.cells.length !== f.columns.length) err(where, `row "${r.label}" has ${r.cells.length} cells for ${f.columns.length} columns.`);
      });
      unique(f.rows.map((r) => r.label), "rows");
      break;
    case "process": {
      const ids = new Set(f.stages.map((s) => s.id));
      unique(f.stages.map((s) => s.id), "stage ids");
      f.arrows.forEach((a) => {
        if (!ids.has(a.from) || !ids.has(a.to)) err(where, `the arrow ${a.from} -> ${a.to} names a stage that does not exist.`);
        if (a.from === a.to) err(where, `the arrow ${a.from} -> ${a.to} points at itself.`);
      });
      const linked = new Set(f.arrows.flatMap((a) => [a.from, a.to]));
      f.stages.forEach((s) => {
        if (!linked.has(s.id)) err(where, `stage "${s.label}" has no arrow in or out.`);
      });
      if (f.stages.length > 9) warn(where, "Cambridge process diagrams have 5-9 stages.");
      break;
    }
    case "map": {
      const { width: W, height: H } = MAP_GRID;
      const inside = (p: number[]) => p.length === 2 && p[0]! >= 0 && p[1]! >= 0 && p[0]! <= W && p[1]! <= H;
      f.states.forEach((s) => {
        const at = `${where} "${s.label}"`;
        const boxes: { label: string; r: Rect }[] = [];
        s.features.forEach((x) => {
          const name = x.label || x.kind;
          if (x.kind === "road" || x.kind === "path") {
            if (x.points.length < 2) err(at, `"${name}" needs at least two points.`);
            else if (!x.points.every(inside)) err(at, `"${name}" goes outside the ${W} x ${H} grid.`);
            return;
          }
          const r = rect(x.box);
          if (!r) return err(at, `"${name}" needs a box [x, y, width, height].`);
          if (!inside([r.x, r.y]) || !inside([r.x + r.w, r.y + r.h])) err(at, `"${name}" goes outside the ${W} x ${H} grid.`);
          if (r.w < 6 || r.h < 4) err(at, `"${name}" is too small to label; make it at least 6 x 4.`);
          if (x.kind !== "water") boxes.push({ label: name, r });
        });
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const [a, b] = [boxes[i]!.r, boxes[j]!.r];
            if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) err(at, `"${boxes[i]!.label}" and "${boxes[j]!.label}" overlap.`);
          }
      });
      const labels = new Set(f.states.flatMap((s) => s.features.map((x) => x.label.trim().toLowerCase()).filter(Boolean)));
      if (labels.size < 8) warn(where, `only ${labels.size} labelled features; Cambridge plans label 9-17.`);
      const sameAll = f.states.every((s) => JSON.stringify(s.features) === JSON.stringify(f.states[0]!.features));
      if (sameAll) err(where, "the plans are identical; show what changed.");
      break;
    }
  }
}
