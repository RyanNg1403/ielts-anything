// Pulls the Cambridge 12-20 sample Writing answers (with their official bands) and the Task 2
// prompts out of the local OCR text, for calibrating the marker. Output stays in corpus/ (gitignored).
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
const dir = "corpus/cambridge/text/";
const files = readdirSync(dir).filter((f) => /^cam(12|13b|15b|16|17|19|20)__/.test(f));
const out = [];
for (const f of files) {
  const book = f.match(/^cam(\d+)/)[1];
  const lines = readFileSync(dir + f, "utf8").split("\n");
  const squash = (l) => l.replace(/\s+/g, "").toUpperCase();
  // Task 2 prompts, in test order.
  const prompts = [];
  lines.forEach((l, i) => {
    if (!/Write about the following topic/.test(l)) return;
    const body = [];
    for (let j = i + 1; j < lines.length && !/^Give reasons|^Write at least/.test(lines[j].trim()); j++) body.push(lines[j]);
    const paras = body.join("\n").split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
    prompts.push({ statement: paras.slice(0, -1).join(" "), question: paras.at(-1) });
  });
  let current = null;
  lines.forEach((l, i) => {
    const h = squash(l).match(/^TEST(\d),WRITINGTASK(\d)$/);
    if (h) current = { test: +h[1], task: +h[2] };
    const b = l.match(/candidate who achieved a Band (\d(?:\.\d)?) score/);
    if (!b || !current) return;
    const text = [];
    for (let j = i + 1; j < lines.length && !/^Here is the examiner/.test(lines[j].trim()); j++) {
      const t = lines[j].trim();
      if (/^Sample Writing answers$|^\d{1,3}$/.test(t)) continue;
      text.push(lines[j]);
    }
    const script = text.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    out.push({ id: `C${book}-T${current.test}-W${current.task}-${b[1]}`, book, ...current, band: +b[1], prompt: current.task === 2 ? prompts[current.test - 1] ?? null : null, script });
  });
}
mkdirSync("corpus/derived", { recursive: true });
writeFileSync("corpus/derived/writing-samples.json", JSON.stringify(out, null, 1));
console.log(out.length, "scripts");
for (const s of out) console.log(s.id, s.script.split(/\s+/).length, "words", s.prompt ? `| ${s.prompt.question}` : "");
