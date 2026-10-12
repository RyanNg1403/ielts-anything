// Makes "learner" clips for the examiner probe with OpenAI TTS (key from .env).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../../.env", import.meta.url), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const out = new URL("./out/", import.meta.url);
mkdirSync(out, { recursive: true });
async function say(name, text) {
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "coral", input: text, response_format: "wav", instructions: "A calm adult language learner speaking at a natural pace." }),
  });
  if (!r.ok) throw new Error(`${name}: ${r.status} ${await r.text()}`);
  writeFileSync(new URL(`${name}.wav`, out), Buffer.from(await r.arrayBuffer()));
  console.log("wrote", name);
}
await say("hello", "Hello.");
await say("name", "My name is Linh Tran.");
await say("turn-a", "I'd like to talk about my grandmother's garden. It is behind her house in a small town near the coast, and I spent most of my summers there when I was a child.");
await say("turn-b", "What I remember most is the smell of the tomatoes and the way she explained everything slowly, so that even a small child could understand how plants grow.");
