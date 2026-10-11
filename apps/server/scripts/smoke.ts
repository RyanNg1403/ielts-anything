// Smoke test: create a conversation, send one message, auto-answer any ask, print events.
// Usage: npx tsx apps/server/scripts/smoke.ts "message"
import WebSocket from "ws";

const base = process.env.BASE ?? "http://localhost:8787";
const text = process.argv[2] ?? "I'd like to practise IELTS reading about AI labs.";
const { id } = await (await fetch(`${base}/api/conversations`, { method: "POST" })).json();
console.log("conversation", id);
const ws = new WebSocket(`${base.replace("http", "ws")}/ws?conversation=${id}`);
let deltas = "";
ws.on("open", () => ws.send(JSON.stringify({ type: "send", text, effort: "low" })));
ws.on("message", (raw) => {
  const e = JSON.parse(String(raw));
  if (e.type === "delta") { deltas += e.delta; return; }
  if (e.type === "thinking") return;
  if (e.type === "item") {
    const it = e.item;
    if (it.type === "dynamicToolCall") console.log(`item ${e.phase}: tool ${it.tool} ${e.phase === "started" ? JSON.stringify(it.arguments).slice(0, 400) : `success=${it.success}`}`);
    else if (it.type === "agentMessage" && e.phase === "completed") console.log("agent:", it.text);
    else console.log(`item ${e.phase}: ${it.type}`);
    return;
  }
  if (e.type === "ask") {
    console.log("ASK", JSON.stringify(e.questions, null, 1).slice(0, 1500));
    const answer = Object.fromEntries(e.questions.map((q: any) => [q.id, [q.options[0].label]]));
    ws.send(JSON.stringify({ type: "answer", askId: e.askId, answer }));
    return;
  }
  console.log("event", JSON.stringify(e).slice(0, 400));
  if (e.type === "turn" && e.status !== "inProgress") { ws.close(); process.exit(0); }
});
