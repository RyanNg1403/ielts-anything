import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { CodexAppServer } from "./codex/app-server.ts";
import { CODEX_HOME, ensureCodexHome } from "./codex/home.ts";
import { conversations } from "./db.ts";
import { Hub } from "./hub.ts";
import { askLearner, showBrief } from "./tools/learner.ts";
import { ToolRegistry } from "./tools/registry.ts";
import { readingTools } from "./tools/reading.ts";
import { appEvents, attempts, library, tests } from "./db.ts";
import { reviewTools } from "./tools/review.ts";
import { markReading, readingTestSchema, toCandidate } from "@ielts/spec";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT ?? 8787);
const SKILLS_DIR = fileURLToPath(new URL("../../../skills", import.meta.url));

const { loggedIn } = ensureCodexHome();
const codex = new CodexAppServer({
  codexHome: CODEX_HOME,
  log: (line) => {
    if (/ERROR|WARN/.test(line)) console.error(`[codex] ${line}`);
  },
});
await codex.start();
await codex.request("skills/extraRoots/set", { extraRoots: [SKILLS_DIR] });

const tools = new ToolRegistry([askLearner, showBrief, ...readingTools(codex), ...reviewTools]);
const hub = new Hub(codex, tools);

const app = new Hono();

app.get("/api/status", async (c) => {
  const account = await codex.request("account/read", { refreshToken: false }).catch(() => null);
  return c.json({ codexRunning: codex.running, loggedIn, account });
});

app.get("/api/conversations", (c) => c.json(conversations.list()));

app.post("/api/conversations", async (c) => c.json({ id: await hub.createConversation() }));

app.patch("/api/conversations/:id", async (c) => {
  const { title } = await c.req.json<{ title: string }>();
  const clean = title?.trim().slice(0, 120);
  if (!clean) return c.json({ error: "A chat needs a name." }, 400);
  conversations.rename(c.req.param("id"), clean);
  return c.json({ ok: true });
});

app.delete("/api/conversations/:id", async (c) => {
  await hub.deleteConversation(c.req.param("id"));
  return c.json({ ok: true });
});

app.get("/api/conversations/:id/tests", (c) => c.json(tests.forConversation(c.req.param("id"))));

app.get("/api/tests/:id", (c) => {
  const row = tests.get(c.req.param("id"));
  if (!row) return c.json({ error: "Test not found." }, 404);
  const spec = readingTestSchema.parse(JSON.parse(row.spec));
  const attempt = attempts.latest(row.id);
  return c.json({
    id: row.id,
    conversationId: conversations.get(row.conversation_id) ? row.conversation_id : null,
    kind: row.kind,
    // Answers are only sent once the learner has submitted.
    test: attempt ? spec : toCandidate(spec),
    attempt: attempt ? { ...attempt, responses: JSON.parse(attempt.responses), result: JSON.parse(attempt.result) } : null,
  });
});

app.post("/api/tests/:id/attempts", async (c) => {
  const row = tests.get(c.req.param("id"));
  if (!row) return c.json({ error: "Test not found." }, 404);
  const { responses, elapsedSec } = await c.req.json<{ responses: Record<string, string>; elapsedSec?: number }>();
  const spec = readingTestSchema.parse(JSON.parse(row.spec));
  const result = markReading(spec, Object.fromEntries(Object.entries(responses).map(([q, a]) => [Number(q), a])));
  const attempt = { id: randomUUID(), test_id: row.id, responses: JSON.stringify(responses), result: JSON.stringify(result), elapsed_sec: elapsedSec ?? null };
  attempts.insert(attempt);
  library.clearProgress(row.id);
  appEvents.add(row.conversation_id, "score", { testId: row.id });
  hub.notify(row.conversation_id, { type: "card", card: { kind: "score", testId: row.id } });
  const missed = result.items.filter((i) => !i.correct).map((i) => i.q);
  await hub
    .injectContext(
      row.conversation_id,
      `The learner submitted "${row.title}" (test ${row.id}): ${result.raw}/${result.total}${result.band ? `, estimated band ${result.band}` : ""}. ` +
        `Missed questions: ${missed.join(", ") || "none"}. A score card is already shown. Use get_test_result before explaining answers.`,
    )
    .catch((err) => console.error("inject failed", err.message));
  return c.json({ test: spec, attempt: { ...attempt, responses, result } });
});

app.get("/api/tests", (c) =>
  c.json(
    library.list().map(({ answered, spec, ...r }) => {
      const answeredCount = answered ? Object.values(JSON.parse(answered) as Record<string, string>).filter((v) => v?.trim()).length : 0;
      const t = JSON.parse(spec) as { passages: { title: string; blocks: { family: string }[] }[] };
      return {
        ...r,
        answeredCount,
        status: r.raw !== null ? "scored" : answeredCount > 0 ? "in_progress" : "not_started",
        parts: t.passages.map((p) => p.title),
        families: [...new Set(t.passages.flatMap((p) => p.blocks.map((b) => b.family)))],
      };
    }),
  ),
);

app.get("/api/tests/:id/progress", (c) => c.json(library.getProgress(c.req.param("id"))));
app.put("/api/tests/:id/progress", async (c) => {
  const { responses, elapsedSec } = await c.req.json<{ responses: Record<string, string>; elapsedSec: number }>();
  library.saveProgress(c.req.param("id"), responses, elapsedSec);
  return c.json({ ok: true });
});

// Analytics for the Progress page: every attempt, plus accuracy by question family.
app.get("/api/progress", (c) => {
  const rows = library.allAttempts();
  const families: Record<string, { correct: number; total: number; skill: string }> = {};
  const history = rows.map((r) => {
    const result = JSON.parse(r.result);
    for (const i of result.items) {
      const f = (families[i.key.family] ??= { correct: 0, total: 0, skill: r.kind });
      f.total += 1;
      if (i.correct) f.correct += 1;
    }
    return { testId: r.test_id, title: r.title, skill: r.kind, mode: r.mode, raw: result.raw, total: result.total, band: result.band, submittedAt: r.submitted_at };
  });
  return c.json({ history, families });
});

app.get("/api/conversations/:id/history", async (c) => {
  const id = c.req.param("id");
  return c.json({ turns: await hub.history(id), events: appEvents.list(id) });
});

const server = serve({ fetch: app.fetch, port: PORT, hostname: "127.0.0.1" }, () => console.log(`server on http://localhost:${PORT}`));

// Browser <-> hub events. One socket per open conversation.
const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const conversationId = url.searchParams.get("conversation");
  if (url.pathname !== "/ws" || !conversationId || !conversations.get(conversationId)) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => attach(ws, conversationId));
});

function attach(ws: WebSocket, conversationId: string) {
  const send = (event: unknown) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(event));
  const unsubscribe = hub.subscribe(conversationId, send);
  ws.on("close", unsubscribe);
  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(String(raw));
      if (msg.type === "send") await hub.send(conversationId, msg.text, { effort: msg.effort });
      else if (msg.type === "answer") hub.answer(msg.askId, msg.answer);
      else if (msg.type === "interrupt") await hub.interrupt(conversationId);
    } catch (err) {
      send({ type: "error", message: (err as Error).message });
    }
  });
}

const shutdown = () => {
  codex.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
