// Probe: can Codex app-server realtime turn a script line into speech?
// Usage: node probe.mjs <voice> <mode: speech|text> "<line>" [prompt]
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";

const [voice = "cedar", mode = "speech", line = "Good morning. I'd like to book a room for the twenty-third of March, please.", prompt] = process.argv.slice(2);
const outDir = new URL("./out/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const proc = spawn("codex", ["app-server"], { stdio: ["pipe", "pipe", "inherit"] });
const rl = createInterface({ input: proc.stdout });
let nextId = 1;
const pending = new Map();
const log = [];
const pcm = [];
let sampleRate = 24000;
let lastAudioAt = 0;

function request(method, params) {
  const id = nextId++;
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
}

rl.on("line", (raw) => {
  const msg = JSON.parse(raw);
  if (msg.id !== undefined && pending.has(msg.id)) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? p.reject(new Error(`${p.method}: ${JSON.stringify(msg.error)}`)) : p.resolve(msg.result);
    return;
  }
  if (msg.method === "thread/realtime/outputAudio/delta") {
    const a = msg.params.audio;
    sampleRate = a.sampleRate;
    pcm.push(Buffer.from(a.data, "base64"));
    lastAudioAt = Date.now();
    return;
  }
  if (msg.method?.startsWith("thread/realtime") || msg.method?.includes("error")) {
    log.push(msg);
    console.error("<-", msg.method, JSON.stringify(msg.params).slice(0, 300));
  }
});

function wav(buffers, rate) {
  const data = Buffer.concat(buffers);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await request("initialize", { clientInfo: { name: "ielts-spike", title: null, version: "0.0.1" }, capabilities: { experimentalApi: true, requestAttestation: false } });
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "initialized" }) + "\n");
  console.error("voices:", JSON.stringify(await request("thread/realtime/listVoices", {})));
  const { thread } = await request("thread/start", { ephemeral: true, cwd: outDir });
  await request("thread/realtime/start", {
    threadId: thread.id,
    outputModality: "audio",
    voice,
    transport: { type: "websocket" },
    includeStartupContext: false,
    clientManagedHandoffs: true,
    prompt: prompt ?? "You are a voice actor recording an IELTS listening test. Speak with a standard Southern British English (RP) accent. Read exactly the text you are given, word for word, with natural intonation. Never add, remove or comment on anything.",
  });
  await sleep(1500);
  if (mode === "speech") await request("thread/realtime/appendSpeech", { threadId: thread.id, text: line });
  else await request("thread/realtime/appendText", { threadId: thread.id, role: "user", text: `Read this aloud exactly: ${line}` });
  const start = Date.now();
  while (Date.now() - start < 45000) {
    await sleep(500);
    if (lastAudioAt && Date.now() - lastAudioAt > 3000) break;
  }
  await request("thread/realtime/stop", { threadId: thread.id }).catch((e) => console.error(e.message));
  const tag = `${voice}-${mode}`;
  if (pcm.length) writeFileSync(`${outDir}${tag}.wav`, wav(pcm, sampleRate));
  writeFileSync(`${outDir}${tag}.events.json`, JSON.stringify(log, null, 2));
  console.error(`audio chunks: ${pcm.length}, rate ${sampleRate}, file ${pcm.length ? tag + ".wav" : "none"}`);
} catch (e) {
  console.error("FAILED", e.message);
} finally {
  proc.kill();
}
