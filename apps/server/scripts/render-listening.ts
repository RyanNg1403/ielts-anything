// Record the sample Listening drill (or a test JSON file) with the voices chosen in Settings,
// to check them by ear: npx tsx apps/server/scripts/render-listening.ts [test.json]
import { readFileSync } from "node:fs";
import { listeningTestSchema, SAMPLE_LISTENING } from "@ielts/spec";
import { audioStatus, ensureAudio, partFile } from "../src/listening/audio.ts";

const test = process.argv[2] ? listeningTestSchema.parse(JSON.parse(readFileSync(process.argv[2], "utf8"))) : SAMPLE_LISTENING;
const id = "sample";
const started = Date.now();

const status = await new Promise<ReturnType<typeof audioStatus>>((resolve) => {
  const report = () => {
    const s = audioStatus(id, test);
    if (s.status === "rendering") console.log(`${s.stage} ${Math.round(s.progress * 100)}%`);
    else resolve(s);
  };
  if (audioStatus(id, test).status === "ready") return report();
  ensureAudio(id, test, report, { retry: true });
});

if (status.status === "failed") {
  console.error(`Failed: ${status.error}`);
  process.exit(1);
}
if (status.status === "ready") {
  console.log(`Done in ${Math.round((Date.now() - started) / 1000)} s with ${status.provider}:`);
  status.parts.forEach((p, i) => console.log(`  ${partFile(id, i + 1)} (${Math.round(p.duration)} s, ${p.cues.length} lines)`));
}
