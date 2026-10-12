// Marks Cambridge sample Task 2 answers with the app's real Writing marker and compares the result
// with the official band. Usage: npx tsx spikes/writing/calibrate.ts [id-filter] [repeat]
import { readFileSync, writeFileSync } from "node:fs";
import { writingWordCount, type Task1, type WritingTest } from "@ielts/spec";
import { CodexAppServer } from "../../apps/server/src/codex/app-server.ts";
import { CODEX_HOME, ensureCodexHome } from "../../apps/server/src/codex/home.ts";
import { markWriting } from "../../apps/server/src/writing/marking.ts";

type Sample = { id: string; book: string; task: number; band: number; prompt: { statement: string; question: string } | null; script: string };
const FIXES: Record<string, { statement: string; question: string }> = {
  "C15-T1-W2-7.0": { statement: "In some countries, owning a home rather than renting one is very important for people.", question: "Why might this be the case? Do you think this is a positive or negative situation?" },
};
// A comma-separated list of id fragments, e.g. "C19-T3,C16-T4".
// Task 1 figures read off the Cambridge pages (values estimated from the printed scale).
const TASK1: Record<string, Task1> = {
  "C17-T4-W1-7.5": {
    intro: "The graph below shows the number of shops that closed and the number of new shops that opened in one country between 2011 and 2018.",
    figures: [{ kind: "line", title: "Number of shop closures and openings 2011-2018", xLabel: "", points: ["2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018"], yLabel: "Number of shops",
      series: [{ name: "Closures", values: [6400, 5900, 7200, 6500, 600, 5200, 5000, 5200] }, { name: "Openings", values: [8500, 3900, 5000, 6200, 4000, 4000, 4200, 3000] }] }],
  },
  "C17-T3-W1-5.5": {
    intro: "The chart below gives information about how families in one country spent their weekly income in 1968 and in 2018.",
    figures: [{ kind: "bar", title: "1968 and 2018: average weekly spending by families", orientation: "horizontal",
      categories: ["Food", "Housing", "Fuel and power", "Clothing and footware", "Household goods", "Personal goods", "Transport", "Leisure"], categoryLabel: "", valueLabel: "% of weekly income",
      series: [{ name: "1968", values: [35, 10, 6, 10, 8, 8, 8, 9] }, { name: "2018", values: [17, 19, 4, 5, 8, 4, 14, 22] }] }],
  },
  "C16-T2-W1-6.0": {
    intro: "The diagram below shows the manufacturing process for making sugar from sugar cane.",
    figures: [{ kind: "process", title: "How sugar is produced from sugar cane", numbered: true,
      stages: [{ id: "s1", label: "Growing (12-18 months)" }, { id: "s2", label: "Harvesting (by machine or by hand)" }, { id: "s3", label: "Crushing (sugar canes into juice)" }, { id: "s4", label: "Purifying juice (limestone filter)" },
        { id: "s5", label: "Evaporator (juice becomes syrup), heat" }, { id: "s6", label: "Centrifuge (separates sugar crystals from syrup)" }, { id: "s7", label: "Drying and cooling (sugar)" }],
      arrows: [{ from: "s1", to: "s2", label: "" }, { from: "s2", to: "s3", label: "" }, { from: "s3", to: "s4", label: "" }, { from: "s4", to: "s5", label: "" }, { from: "s5", to: "s6", label: "" }, { from: "s6", to: "s7", label: "" }] }],
  },
};
const filter = (process.argv[2] ?? "").split(",");
const repeat = Number(process.argv[3] ?? 1);
const samples = (JSON.parse(readFileSync("corpus/derived/writing-samples.json", "utf8")) as Sample[]).filter(
  (s) => ((s.task === 2 && /^(15|16|17|19)$/.test(s.book)) || TASK1[s.id]) && filter.some((f) => s.id.includes(f)),
);

ensureCodexHome();
const codex = new CodexAppServer({ codexHome: CODEX_HOME });
await codex.start();

// OCR reads a capital I standing alone as "|".
const clean = (t: string) => t.replace(/(^|\s)\|(\s)/g, "$1I$2");
const results: unknown[] = [];
const queue = samples.flatMap((s) => Array.from({ length: repeat }, () => s));
async function worker() {
  for (let s = queue.shift(); s; s = queue.shift()) {
    const n = s.task as 1 | 2;
    let test: WritingTest;
    if (n === 1) test = { kind: "writing", mode: "drill", title: s.id, topic: "", task1: TASK1[s.id]!, task2: null };
    else {
      const prompt = FIXES[s.id] ?? s.prompt!;
      const questions = prompt.question.split(/(?<=\?)\s+/);
      test = {
        kind: "writing",
        mode: "drill",
        title: s.id,
        topic: "",
        task1: null,
        task2: { family: questions.length > 1 ? "two-part" : "opinion", statement: prompt.statement, questions, obligations: ["answer every part of the question as printed"] },
      };
    }
    const started = Date.now();
    try {
      const r = await markWriting(codex, test, { [`${n}`]: clean(s.script) });
      const t = r.tasks[`${n}`]!;
      const line = `${s.id.padEnd(16)} official ${s.band.toFixed(1)}  marked ${r.band?.toFixed(1)}  (T ${t.task.band} CC ${t.coherence.band} LR ${t.lexical.band} GRA ${t.grammar.band})  diff ${(r.band! - s.band).toFixed(1)}  ${writingWordCount(s.script)}w ${Math.round((Date.now() - started) / 1000)}s`;
      console.log(line);
      results.push({ id: s.id, official: s.band, marked: r.band, task: t });
    } catch (err) {
      console.log(`${s.id} FAILED ${(err as Error).message}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
writeFileSync(`spikes/writing/out/calibration-${Date.now()}.json`, JSON.stringify(results, null, 1));
const diffs = (results as { official: number; marked: number }[]).map((r) => r.marked - r.official);
const mae = diffs.reduce((a, d) => a + Math.abs(d), 0) / diffs.length;
console.log(`n=${diffs.length}  mean error ${(diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(2)}  mean absolute error ${mae.toFixed(2)}  within 0.5: ${diffs.filter((d) => Math.abs(d) <= 0.5).length}`);
process.exit(0);
