// Splits the column layout of the official Writing band descriptors (pdftotext -layout) into
// band x criterion text, using each page's header positions as column edges.
// Usage: node descriptors.mjs <ielts-writing-band-descriptors.txt>
import { readFileSync } from "node:fs";
const lines = readFileSync(process.argv[2], "utf8").split("\n");
const out = { 1: {}, 2: {} };
let task = 1, cols = null, block = [], blanks = 0;
const flush = () => {
  if (!cols || !block.length) return (block = []);
  const num = block.map((l) => l.slice(0, cols[0]).trim()).find((s) => /^\d$/.test(s));
  if (num === undefined) return (block = []);
  for (let c = 0; c < 4; c++) {
    const text = block
      .map((l) => l.slice(cols[c], c < 3 ? cols[c + 1] : undefined).trim())
      .join("\n")
      .replace(/\n{2,}/g, "\u0000")
      .replace(/\n/g, " ")
      .split("\u0000")
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    ((out[task][num] ??= [])[c] ??= []).push(...text);
  }
  block = [];
};
for (const l of lines) {
  if (/^Writing Task 2/.test(l)) (flush(), (task = 2));
  if (/^ Band\s+Task (Achievement|Response)/.test(l)) {
    flush();
    cols = [l.indexOf("Task "), l.indexOf("Coherence"), l.indexOf("Lexical"), l.indexOf("Grammatical")].map((x) => x - 1);
    continue;
  }
  if (!cols || /^ Score|Band Descriptors|Updated May|Page \d|Please visit|Scoring criteria|A script must|Bolded text/.test(l)) continue;
  if (!l.trim()) {
    if (++blanks === 2) flush();
    block.push("");
    continue;
  }
  blanks = 0;
  block.push(l);
}
flush();
console.log(JSON.stringify(out, null, 1));
