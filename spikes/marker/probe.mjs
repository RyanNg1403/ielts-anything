// Probe: can a fresh Codex realtime v3 session mark a Speaking test from a recording played in as
// its microphone? Plays out/interview.wav, then asks for the assessment. Prints every transcript.
// Usage: node spikes/marker/probe.mjs [recording.wav]
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const recording = process.argv[2] ?? new URL("./out/interview.wav", import.meta.url).pathname;

const GUIDE = readFileSync(new URL("../../skills/speaking-assessor/SKILL.md", import.meta.url), "utf8")
  .replace(/^---[\s\S]*?---\n/, "")
  .replace(/^# .*\n/m, "")
  .trim();
const PROMPT = [
  "You are an IELTS Speaking examiner marking a Speaking test from its recording.",
  "The recording will now play to you: an examiner asks questions and a candidate answers. Mark only the candidate.",
  "While it plays, say nothing at all, not even \"mm\" or \"thank you\", whatever you hear and however long the pauses are.",
  "Notes that start with [App] come from the software. When an [App] note says the recording is over, give your assessment as described below.",
  "After \"End of assessment.\" say nothing more.",
  "",
  "YOUR ASSESSMENT",
  GUIDE,
].join("\n");

const proc = spawn("codex", ["app-server"], { stdio: ["pipe", "pipe", "pipe"] });
const rl = createInterface({ input: proc.stdout });
let nextId = 1;
const pending = new Map();
const t0 = Date.now();
const log = [];
const stamp = () => `${Math.round((Date.now() - t0) / 1000)}s`;
const request = (method, params) => {
  const id = nextId++;
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
};
let sdpResolve;
let assessment = "";
let live = "";
let firstAt = null;
rl.on("line", (raw) => {
  const msg = JSON.parse(raw);
  if (msg.id !== undefined && pending.has(msg.id)) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    return msg.error ? p.reject(new Error(`${p.method}: ${JSON.stringify(msg.error)}`)) : p.resolve(msg.result);
  }
  if (msg.method === "thread/realtime/transcript/delta" && msg.params.role !== "user") { live += msg.params.delta; if (!firstAt && /assessment/i.test(live)) firstAt = stamp(); }
  if (msg.method === "thread/realtime/sdp") sdpResolve?.(msg.params.sdp);
  if (msg.method === "thread/realtime/transcript/done") {
    log.push(`${stamp()} [${msg.params.role}] ${msg.params.text}`);
    if (msg.params.role !== "user") assessment += " " + msg.params.text;
  }
  if (msg.method === "thread/realtime/error" || msg.method === "thread/realtime/closed") log.push(`${stamp()} ${msg.method} ${JSON.stringify(msg.params)}`);
});

const page_html = `<!doctype html><script>
window.run = async () => {
  const pc = new RTCPeerConnection();
  const ctx = new AudioContext();
  const mic = ctx.createMediaStreamDestination();
  pc.addTrack(mic.stream.getAudioTracks()[0], mic.stream);
  const dc = pc.createDataChannel("oai-events");
  const dcLog = [];
  dc.onmessage = (e) => { const m = JSON.parse(e.data); if (/context_window|usage|session.started/.test(m.type)) dcLog.push(JSON.stringify(m).slice(0, 600)); else if (!/delta/.test(m.type)) dcLog.push(m.type + (m.error ? " " + JSON.stringify(m.error) : "")); };
  pc.ontrack = (e) => { const a = new Audio(); a.srcObject = e.streams[0]; a.muted = true; a.play().catch(() => {}); };
  await pc.setLocalDescription(await pc.createOffer());
  await new Promise((r) => { pc.onicegatheringstatechange = () => pc.iceGatheringState === "complete" && r(); setTimeout(r, 2500); });
  const { sdp, error } = await (await fetch("/start", { method: "POST", body: JSON.stringify({ sdp: pc.localDescription.sdp }) })).json();
  if (error) return { error };
  await pc.setRemoteDescription({ type: "answer", sdp });
  await new Promise((r) => (dc.readyState === "open" ? r() : (dc.onopen = r)));
  const send = (o) => dc.send(JSON.stringify(o));
  const note = (text) => send({ type: "session.context.append", content: [{ type: "input_text", text: "[App] " + text }] });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (window.MODE === "manual") send({ type: "session.update", session: { type: "realtime", audio: { input: { turn_detection: { type: "server_vad", create_response: false, interrupt_response: false } } } } });
  await wait(1000);
  note("The recording starts now. Stay silent until the recording is over.");
  const buf = await ctx.decodeAudioData(await (await fetch("/recording")).arrayBuffer());
  const src = ctx.createBufferSource(); src.buffer = buf; src.connect(mic); src.start();
  await wait(buf.duration * 1000 + 2000);
  note("The recording is over. Give your assessment now, in the format you were given.");
  if (window.MODE === "manual") send({ type: "response.create" });
  else { send({ type: "input_audio.pause" }); await wait(400); send({ type: "input_audio.resume" }); }
  for (let i = 0; i < 480 && !window.done; i++) await wait(1000);
  pc.close();
  return { seconds: buf.duration, dcLog: [...new Set(dcLog)] };
};
</script>`;

const body = (req) => new Promise((r) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => r(JSON.parse(s || "{}"))); });
let threadId;
const server = createServer(async (req, res) => {
  if (req.url === "/") return res.end(page_html);
  if (req.url === "/recording") return res.end(readFileSync(recording));
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
await request("initialize", { clientInfo: { name: "marker-probe", title: null, version: "0" }, capabilities: { experimentalApi: true } });
proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "initialized" }) + "\n");

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("[pageerror]", e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
const finished = setInterval(() => /end of (the )?assessment/i.test(live) && page.evaluate(() => (window.done = true)).catch(() => {}), 1000);
await page.evaluate((m) => (window.MODE = m), process.env.MODE ?? "auto");
const r = await page.evaluate(() => window.run());
clearInterval(finished);
await new Promise((res) => setTimeout(res, 1500));
await request("thread/realtime/stop", { threadId }).catch(() => {});
const report = `${JSON.stringify(r)}\n${log.join("\n")}\n\nASSESSMENT STARTED ${firstAt}, ENDED ${stamp()}\nLIVE OUTPUT:\n${live}`;
writeFileSync(new URL(`./out/run-${Date.now()}.log`, import.meta.url), report);
console.log(report);
await browser.close();
proc.kill();
server.close();
