// Probe: can a fresh Codex realtime v3 session name mispronounced words in one short answer?
// Plays each clip into its own new session, asks for a list of mispronounced words, prints what it said.
// Planted errors (respelled in the TTS input): see answers-weak.mjs and answers-levels.mjs.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { createRequire } from "node:module";
import fs, { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const PROBE = new URL("../../apps/web/public/__probe/", import.meta.url);

const CLIPS = [
  { clip: "ai-weak/p3_0", planted: ["think (tink)", "world (wold)"] },
  { clip: "ai-weak/p3_1", planted: ["think (tink)"] },
  { clip: "ai-weak/p3_2", planted: ["this (dis)", "important (importan)"] },
  { clip: "ai-weak/p3_3", planted: ["company (kom-PAN-ee)"] },
  { clip: "ai-weak/p3_5", planted: ["company (kom-PAN-ee)", "important (importan)", "think (tink)"] },
  { clip: "ai-b4/p3_0", planted: ["dangerous (dangerus)", "thing (ting)", "world (wold)"] },
  { clip: "ai-b4/p3_1", planted: ["think (tink)"] },
  { clip: "ai-b4/p3_3", planted: ["company (kom-PAN-ee)"] },
  { clip: "ai-b4/p3_5", planted: ["law (lor)", "company (kom-PAN-ee)"] },
  { clip: "ai/p3_0", planted: [] },
  { clip: "ai-b7/p3_0", planted: [] },
  { clip: "ai-b9/p3_0", planted: [] },
];

const REAL = { tink: "think", wold: "world", dis: "this", importan: "important", "kom-PAN-ee": "company", "Kom-PAN-ee": "Company", dangerus: "dangerous", ting: "thing", lor: "law" };
const scripts = {};
for (const f of ["answers.mjs", "answers-weak.mjs", "answers-levels.mjs"]) {
  const src = fs.readFileSync(new URL("./" + f, import.meta.url), "utf8");
  for (const m of src.matchAll(/(p3_\d): "((?:[^"\\]|\\.)*)"/g)) (scripts[f] ??= []).push([m[1], m[2]]);
}
const intended = (clip) => {
  const [dir, name] = clip.split("/");
  const f = dir === "ai" ? "answers.mjs" : dir === "ai-weak" ? "answers-weak.mjs" : "answers-levels.mjs";
  const all = scripts[f].filter(([n]) => n === name);
  // answers-levels.mjs holds three levels in order b4, b7, b9.
  const text = f === "answers-levels.mjs" ? all[["ai-b4", "ai-b7", "ai-b9"].indexOf(dir)][1] : all[0][1];
  return text.replace(/kom-PAN-ee|Kom-PAN-ee|\b(tink|wold|dis|importan|dangerus|ting|lor)\b/g, (w) => REAL[w] ?? w);
};
const WITH_TEXT = process.env.WITH_TEXT === "1";
if (process.env.DRY) { for (const c of ["ai-weak/p3_0", "ai-weak/p3_3", "ai-b4/p3_5", "ai-b7/p3_0"]) console.log(c, "=>", intended(c)); process.exit(0); }

const PROMPT = [
  "You are a pronunciation listener helping an IELTS Speaking examiner. You will hear one answer spoken by a candidate.",
  "Listen closely to how every word is pronounced: individual sounds (for example th, v and w, l and r, vowel length), dropped or added sounds at the ends of words, and word stress.",
  "If an [App] note tells you the words the candidate meant to say, use it to know which words to listen to, then judge only from the sound of each word.",
  "While the candidate is speaking, say nothing at all. Notes that start with [App] come from the software.",
  "When an [App] note says the answer is over, say exactly: \"Mispronounced:\" then each word you heard pronounced wrongly, as \"the word, said as\" and what you heard, for example \"think, said as tink\". Separate them with semicolons.",
  "Only name words you clearly heard pronounced wrongly. An accent that does not change the word is not a mispronunciation. If there were none, say \"Mispronounced: none.\"",
  "Then say nothing more.",
].join("\n");

const proc = spawn("codex", ["app-server"], { stdio: ["pipe", "pipe", "pipe"] });
const rl = createInterface({ input: proc.stdout });
let nextId = 1;
const pending = new Map();
const request = (method, params) => {
  const id = nextId++;
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
};
let sdpResolve;
let said = [];
let heard = [];
rl.on("line", (raw) => {
  const msg = JSON.parse(raw);
  if (msg.id !== undefined && pending.has(msg.id)) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    return msg.error ? p.reject(new Error(`${p.method}: ${JSON.stringify(msg.error)}`)) : p.resolve(msg.result);
  }
  if (msg.method === "thread/realtime/sdp") sdpResolve?.(msg.params.sdp);
  if (msg.method === "thread/realtime/transcript/done") (msg.params.role === "user" ? heard : said).push(msg.params.text);
});

const page_html = `<!doctype html><script>
window.run = async (clip, text) => {
  const pc = new RTCPeerConnection();
  const ctx = new AudioContext();
  const mic = ctx.createMediaStreamDestination();
  pc.addTrack(mic.stream.getAudioTracks()[0], mic.stream);
  const dc = pc.createDataChannel("oai-events");
  pc.ontrack = (e) => { const a = new Audio(); a.srcObject = e.streams[0]; a.muted = true; a.play().catch(() => {}); };
  await pc.setLocalDescription(await pc.createOffer());
  await new Promise((r) => { pc.onicegatheringstatechange = () => pc.iceGatheringState === "complete" && r(); setTimeout(r, 2500); });
  const { sdp, error } = await (await fetch("/start", { method: "POST", body: JSON.stringify({ sdp: pc.localDescription.sdp }) })).json();
  if (error) return { error };
  await pc.setRemoteDescription({ type: "answer", sdp });
  await new Promise((r) => (dc.readyState === "open" ? r() : (dc.onopen = r)));
  const send = (o) => dc.send(JSON.stringify(o));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1000);
  if (text) send({ type: "session.context.append", content: [{ type: "input_text", text: "[App] The words the candidate meant to say: " + text }] });
  const buf = await ctx.decodeAudioData(await (await fetch("/clip/" + clip + ".wav")).arrayBuffer());
  const src = ctx.createBufferSource(); src.buffer = buf; src.connect(mic); src.start();
  await wait(buf.duration * 1000 + 1500);
  send({ type: "session.context.append", content: [{ type: "input_text", text: "[App] The answer is over. Say your list now." }] });
  send({ type: "input_audio.pause" }); await wait(400); send({ type: "input_audio.resume" });
  for (let i = 0; i < 40 && !window.done; i++) await wait(1000);
  pc.close();
  return { seconds: Math.round(buf.duration) };
};
</script>`;

const body = (req) => new Promise((r) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => r(JSON.parse(s || "{}"))); });
let threadId;
const server = createServer(async (req, res) => {
  if (req.url === "/") return res.end(page_html);
  if (req.url.startsWith("/clip/")) return res.end(readFileSync(new URL(req.url.slice(6), PROBE)));
  const job = await body(req);
  try {
    ({ thread: { id: threadId } } = await request("thread/start", { ephemeral: true, sandbox: "read-only", approvalPolicy: "never" }));
    const sdp = new Promise((r) => (sdpResolve = r));
    await request("thread/realtime/start", {
      threadId, version: "v3", voice: "spruce", outputModality: "audio", transport: { type: "webrtc", sdp: job.sdp },
      includeStartupContext: false, clientManagedHandoffs: true, prompt: PROMPT,
    });
    res.end(JSON.stringify({ sdp: await sdp }));
  } catch (e) {
    res.end(JSON.stringify({ error: e.message }));
  }
});
await new Promise((r) => server.listen(0, r));
await request("initialize", { clientInfo: { name: "listener-probe", title: null, version: "0" }, capabilities: { experimentalApi: true } });
proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "initialized" }) + "\n");

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/`);

const report = [];
for (const { clip, planted } of CLIPS) {
  said = [];
  heard = [];
  await page.evaluate(() => (window.done = false));
  let seenAt = 0;
  const watch = setInterval(() => {
    if (!seenAt && /mispronounced\s*:/i.test(said.join(" "))) seenAt = Date.now();
    // Give the full list time to finish arriving.
    if (seenAt && Date.now() - seenAt > 8000) page.evaluate(() => (window.done = true)).catch(() => {});
  }, 1000);
  const r = await page.evaluate(([c, t]) => window.run(c, t), [clip, WITH_TEXT ? intended(clip) : null]);
  clearInterval(watch);
  await new Promise((res) => setTimeout(res, 1500));
  await request("thread/realtime/stop", { threadId }).catch(() => {});
  const line = `== ${clip} ${JSON.stringify(r)}\nplanted: ${planted.join("; ") || "none (clean control)"}\nlistener: ${said.join(" ") || "(nothing)"}\nheard as text: ${heard.join(" ")}\n`;
  console.log(line);
  report.push(line);
}
writeFileSync(new URL(`./out/listener-${WITH_TEXT ? "text-" : ""}${Date.now()}.log`, import.meta.url), report.join("\n"));
await browser.close();
proc.kill();
server.close();
