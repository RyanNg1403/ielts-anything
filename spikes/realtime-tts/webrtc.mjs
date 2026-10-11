// Spike: Codex realtime voice over WebRTC (ChatGPT auth) as a TTS source for IELTS listening.
// A headless Chromium page owns the RTCPeerConnection and records the remote audio track;
// this process relays the SDP to `codex app-server` and sends appendSpeech/appendText.
// Usage: node webrtc.mjs [jobs.json]
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const require = createRequire("/Users/PhatNguyen/Desktop/skill-up/open-game-harness/package.json");
const { chromium } = require("playwright-core");

const here = new URL("./", import.meta.url).pathname;
const outDir = `${here}out/`;
mkdirSync(outDir, { recursive: true });
const jobs = JSON.parse(readFileSync(process.argv[2] ?? `${here}jobs.json`, "utf8"));

// --- app-server JSON-RPC ---
const proc = spawn("codex", ["app-server"], { stdio: ["pipe", "pipe", "pipe"] });
proc.stderr.on("data", (d) => { const s = String(d); if (/ERROR|WARN/.test(s)) process.stderr.write(s); });
const rl = createInterface({ input: proc.stdout });
let nextId = 1;
const pending = new Map();
const waiters = [];
function request(method, params) {
  const id = nextId++;
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
}
function waitFor(method, ms = 20000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), ms);
    waiters.push({ method, resolve: (p) => { clearTimeout(t); resolve(p); } });
  });
}
const events = [];
rl.on("line", (raw) => {
  const msg = JSON.parse(raw);
  if (msg.id !== undefined && pending.has(msg.id)) {
    const p = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? p.reject(new Error(`${p.method}: ${JSON.stringify(msg.error)}`)) : p.resolve(msg.result);
    return;
  }
  if (!msg.method) return;
  if (msg.method.startsWith("thread/realtime")) {
    events.push(msg);
    if (!msg.method.includes("delta")) console.error("<-", msg.method, JSON.stringify(msg.params).slice(0, 200));
  }
  for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].method === msg.method) waiters.splice(i, 1)[0].resolve(msg.params);
});

// --- page + local http relay ---
const page_html = `<!doctype html><script>
window.runJob = async (job) => {
  const pc = new RTCPeerConnection();
  const ctx = new AudioContext();
  const silent = ctx.createMediaStreamDestination();
  pc.addTrack(silent.stream.getAudioTracks()[0], silent.stream);
  window.playUserAudio = async () => {
    const buf = await ctx.decodeAudioData(await (await fetch("/user.wav")).arrayBuffer());
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(silent); src.start();
    console.log("playing user audio", buf.duration.toFixed(1) + "s");
  };
  const dc = pc.createDataChannel("oai-events");
  pc.onconnectionstatechange = () => console.log("pc", pc.connectionState);
  pc.oniceconnectionstatechange = () => console.log("ice", pc.iceConnectionState);
  dc.onopen = () => console.log("dc open");
  dc.onmessage = (e) => { const t = JSON.parse(e.data).type; if (!/added|delta|usage/.test(t)) console.log("dc", String(e.data).slice(0, 160)); };
  const remote = new Promise((r) => (pc.ontrack = (e) => console.log("track", e.track.kind) || r(e.streams[0] ?? new MediaStream([e.track]))));
  await pc.setLocalDescription(await pc.createOffer());
  await new Promise((r) => { if (pc.iceGatheringState === "complete") r(); pc.onicegatheringstatechange = () => pc.iceGatheringState === "complete" && r(); setTimeout(r, 3000); });
  const res = await fetch("/start", { method: "POST", body: JSON.stringify({ ...job, sdp: pc.localDescription.sdp }) });
  const { sdp, error } = await res.json();
  if (error) return { error };
  await pc.setRemoteDescription({ type: "answer", sdp });
  const stream = await remote;
  const sink = new Audio(); sink.srcObject = stream; sink.muted = true; sink.play().catch(() => {});
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const pcm = [];
  proc.onaudioprocess = (e) => pcm.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(proc); proc.connect(ctx.destination);
  if (job.mode === "audio") { await new Promise((r) => setTimeout(r, 1500)); await window.playUserAudio(); }
  const done = await (await fetch("/speak", { method: "POST", body: JSON.stringify(job) })).json();
  proc.disconnect(); pc.close();
  const n = pcm.reduce((a, b) => a + b.length, 0);
  const out = new DataView(new ArrayBuffer(44 + n * 2));
  const w = (o, str) => [...str].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); out.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); out.setUint16(22, 1, true); out.setUint32(24, ctx.sampleRate, true); out.setUint32(28, ctx.sampleRate * 2, true);
  out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, "data"); out.setUint32(40, n * 2, true);
  let off = 44; for (const b of pcm) for (const v of b) { out.setInt16(off, Math.max(-1, Math.min(1, v)) * 32767, true); off += 2; }
  const bytes = new Uint8Array(out.buffer);
  let bin = ""; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { done, audio: btoa(bin) };
};
</script>`;

let threadId;
const body = (req) => new Promise((r) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => r(JSON.parse(s || "{}"))); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = createServer(async (req, res) => {
  try {
    if (req.url === "/") return res.end(page_html);
    if (req.url === "/user.wav") return res.end(readFileSync(`${outDir}user-line.wav`));
    const job = await body(req);
    if (req.url === "/start") {
      ({ thread: { id: threadId } } = await request("thread/start", { ephemeral: true, cwd: outDir }));
      const sdpP = waitFor("thread/realtime/sdp");
      await request("thread/realtime/start", {
        threadId, outputModality: "audio", voice: job.voice, transport: { type: "webrtc", sdp: job.sdp },
        includeStartupContext: false, clientManagedHandoffs: true, prompt: job.prompt, version: job.version ?? "v2",
      });
      const { sdp } = await sdpP;
      return res.end(JSON.stringify({ sdp }));
    }
    if (req.url === "/speak") {
      await sleep(1500);
      const before = events.length;
      if (job.mode === "audio") {}
      else if (job.mode === "text") await request("thread/realtime/appendText", { threadId, role: "user", text: job.text });
      else await request("thread/realtime/appendSpeech", { threadId, text: job.text });
      // wait until transcript is done (or timeout), then let audio drain
      await waitFor("thread/realtime/transcript/done", job.timeoutMs ?? 40000).catch((e) => console.error(e.message));
      await sleep(job.tailMs ?? 2500);
      await request("thread/realtime/stop", { threadId }).catch(() => {});
      const transcript = events.slice(before).filter((e) => e.method === "thread/realtime/transcript/delta").map((e) => e.params.delta).join("");
      return res.end(JSON.stringify({ transcript }));
    }
    res.statusCode = 404; res.end();
  } catch (e) {
    console.error("server error", e.message);
    res.end(JSON.stringify({ error: e.message }));
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

await request("initialize", { clientInfo: { name: "ielts-spike", title: null, version: "0.0.1" }, capabilities: { experimentalApi: true, requestAttestation: false } });
proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "initialized" }) + "\n");

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/Users/PhatNguyen/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell", args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream"] });
const page = await browser.newPage();
page.on("console", (m) => console.error("[page]", m.text()));
await page.goto(`http://127.0.0.1:${port}/`);

const results = [];
for (const job of jobs) {
  console.error(`\n== ${job.name} (${job.voice}, ${job.mode})`);
  const r = await page.evaluate((j) => window.runJob(j), job);
  if (r.error) { console.error("job failed:", r.error); results.push({ name: job.name, error: r.error }); continue; }
  writeFileSync(`${outDir}${job.name}.wav`, Buffer.from(r.audio, "base64"));
  results.push({ name: job.name, voice: job.voice, mode: job.mode, script: job.text, transcript: r.done.transcript });
  console.error("transcript:", r.done.transcript);
}
writeFileSync(`${outDir}results.json`, JSON.stringify(results, null, 2));
writeFileSync(`${outDir}events.json`, JSON.stringify(events.filter((e) => !e.method.includes("delta")), null, 2));
await browser.close();
proc.kill();
server.close();
