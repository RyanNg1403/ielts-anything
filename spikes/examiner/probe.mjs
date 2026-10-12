// Probe: can a Codex realtime v3 voice (WebRTC, ChatGPT login) speak first, and can the page
// steer it with client events on the "oai-events" data channel? Prints transcripts per job.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
let jobStart = Date.now();

const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright-core");

const proc = spawn("codex", ["app-server"], { stdio: ["pipe", "pipe", "pipe"] });
const rl = createInterface({ input: proc.stdout });
let nextId = 1;
const pending = new Map();
const log = [];
const request = (method, params) => {
  const id = nextId++;
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
};
let sdpResolve;
rl.on("line", (raw) => {
  const msg = JSON.parse(raw);
  if (msg.id !== undefined && pending.has(msg.id)) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    return msg.error ? p.reject(new Error(`${p.method}: ${JSON.stringify(msg.error)}`)) : p.resolve(msg.result);
  }
  if (msg.method === "thread/realtime/sdp") sdpResolve?.(msg.params.sdp);
  if (msg.method === "thread/realtime/transcript/done") log.push(`${Math.round((Date.now() - jobStart) / 1000)}s [${msg.params.role}] ${msg.params.text}`);
  if (msg.method === "thread/realtime/error" || msg.method === "thread/realtime/closed") log.push(`${msg.method} ${JSON.stringify(msg.params)}`);
});

const page_html = `<!doctype html><script>
window.run = async (job) => {
  const pc = new RTCPeerConnection();
  const ctx = new AudioContext();
  const silent = ctx.createMediaStreamDestination();
  pc.addTrack(silent.stream.getAudioTracks()[0], silent.stream);
  const dc = pc.createDataChannel("oai-events");
  const dcLog = [];
  dc.onmessage = (e) => { const t = JSON.parse(e.data).type; if (!/delta/.test(t)) dcLog.push(t); };
  let audioBytes = 0;
  pc.ontrack = (e) => {
    const src = ctx.createMediaStreamSource(e.streams[0] ?? new MediaStream([e.track]));
    const p = ctx.createScriptProcessor(4096, 1, 1);
    p.onaudioprocess = (ev) => { const d = ev.inputBuffer.getChannelData(0); for (const v of d) if (Math.abs(v) > 0.01) audioBytes++; };
    src.connect(p); p.connect(ctx.destination);
    const a = new Audio(); a.srcObject = e.streams[0]; a.muted = true; a.play().catch(()=>{});
  };
  await pc.setLocalDescription(await pc.createOffer());
  await new Promise((r) => { pc.onicegatheringstatechange = () => pc.iceGatheringState === "complete" && r(); setTimeout(r, 2500); });
  const { sdp, error } = await (await fetch("/start", { method: "POST", body: JSON.stringify({ ...job, sdp: pc.localDescription.sdp }) })).json();
  if (error) return { error };
  await pc.setRemoteDescription({ type: "answer", sdp });
  await new Promise((r) => (dc.readyState === "open" ? r() : (dc.onopen = r)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const t0 = performance.now();
  const marks = [];
  for (const step of job.timeline ?? []) {
    if (step.wait) await wait(step.wait);
    if (step.send) dc.send(JSON.stringify(step.send));
    console.log("step", JSON.stringify(step).slice(0, 60), ctx.state);
    if (step.play) {
      const buf = await ctx.decodeAudioData(await (await fetch("/audio/" + step.play + ".wav")).arrayBuffer());
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(silent); src.start();
      marks.push(step.play + "@" + Math.round((performance.now() - t0) / 1000) + "s-" + Math.round((performance.now() - t0) / 1000 + buf.duration) + "s");
      if (!step.noWait) await wait(buf.duration * 1000);
    }
  }
  const before = 0;
  pc.close();
  return { marks, dcLog: [...new Set(dcLog)] };
};
</script>`;

const body = (req) => new Promise((r) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => r(JSON.parse(s || "{}"))); });
let threadId;
const server = createServer(async (req, res) => {
  if (req.url === "/") return res.end(page_html);
  if (req.url.startsWith("/audio/")) return res.end(readFileSync(new URL("./out/" + req.url.slice(7), import.meta.url)));
  const job = await body(req);
  try {
    ({ thread: { id: threadId } } = await request("thread/start", { ephemeral: true }));
    const sdp = new Promise((r) => (sdpResolve = r));
    await request("thread/realtime/start", {
      threadId, version: "v3", voice: "spruce", outputModality: "audio", transport: { type: "webrtc", sdp: job.sdp },
      includeStartupContext: false, clientManagedHandoffs: true, prompt: job.prompt, ...(job.start ?? {}), ...(job.initialItems ? { initialItems: job.initialItems } : {}),
    });
    res.end(JSON.stringify({ sdp: await sdp }));
  } catch (e) {
    res.end(JSON.stringify({ error: e.message }));
  }
});
await new Promise((r) => server.listen(0, r));
await request("initialize", { clientInfo: { name: "examiner-probe", title: null, version: "0" }, capabilities: { experimentalApi: true } });
proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "initialized" }) + "\n");

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
page.on("console", (m) => console.error("[page]", m.text()));
page.on("pageerror", (e) => console.error("[pageerror]", e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);

const examiner = "You are an IELTS Speaking examiner. As soon as the session starts, greet the candidate: say 'Good morning. My name is Sam. Can you tell me your full name, please?'";
const jobs = JSON.parse(process.argv[2]);
for (const job of jobs) {
  log.length = 0;
  jobStart = Date.now();
  const r = await page.evaluate((j) => window.run(j), job);
  await new Promise((res) => setTimeout(res, 1500));
  await request("thread/realtime/stop", { threadId }).catch(() => {});
  console.log(`\n== ${job.name}\n`, JSON.stringify(r), "\n", log.join("\n "));
}
await browser.close();
proc.kill();
server.close();
