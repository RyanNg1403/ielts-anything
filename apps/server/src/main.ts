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
import {
  markReading,
  readingTestSchema,
  speakingMetricsSchema,
  speakingParts,
  speakingTestSchema,
  SPEAKING_PART_NAMES,
  toCandidate,
  toSpeakingCandidate,
  transcriptLineSchema,
  task1Label,
  TASK2_NAMES,
  writingTestSchema,
} from "@ielts/spec";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { DEFAULT_EFFORT, DEFAULT_MODEL } from "./codex/defaults.ts";
import { markSpeaking } from "./speaking/marking.ts";
import { SpeakingSessions } from "./speaking/sessions.ts";
import { speakingPublish } from "./tools/speaking.ts";
import { writingTools } from "./tools/writing.ts";
import { figurePath, installReferences } from "./writing/images.ts";
import { markWriting } from "./writing/marking.ts";
import { answerDeleteRequest, deleteTest, manageTools } from "./tools/manage.ts";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { deleteRecording, recordingExt, recordingFile, saveRecording } from "./recordings.ts";

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
if (!installReferences()) console.error("No Cambridge figure references in corpus/derived/figure-refs: maps and process diagrams will be drawn without them.");

const tools = new ToolRegistry([askLearner, showBrief, ...readingTools(codex), speakingPublish, ...writingTools(codex), ...reviewTools, ...manageTools]);
const speaking = new SpeakingSessions(codex);
const hub = new Hub(codex, tools);

const app = new Hono();

app.get("/api/status", async (c) => {
  const account = await codex.request("account/read", { refreshToken: false }).catch(() => null);
  return c.json({ codexRunning: codex.running, loggedIn, account });
});

// The models the learner's Codex account offers, for the composer's model picker.
let models: unknown = null;
app.get("/api/models", async (c) => {
  if (!models) {
    const r: any = await codex.request("model/list", {});
    models = r.data
      .filter((m: any) => !m.hidden)
      .map((m: any) => ({
        id: m.id,
        name: m.displayName,
        description: m.description,
        // The app's default, not the account's: the composer starts on it.
        isDefault: m.id === DEFAULT_MODEL,
        efforts: m.supportedReasoningEfforts.map((e: any) => e.reasoningEffort),
        fast: m.serviceTiers.find((t: any) => t.id === "priority")?.description ?? null,
      }));
  }
  return c.json({ models, defaultEffort: DEFAULT_EFFORT });
});

app.post("/api/conversations/:id/voice", async (c) => {
  const { sdp } = await c.req.json<{ sdp: string }>();
  try {
    return c.json({ sdp: await hub.startVoice(c.req.param("id"), sdp) });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 502);
  }
});

app.delete("/api/conversations/:id/voice", async (c) => {
  await hub.stopVoice(c.req.param("id"));
  return c.json({ ok: true });
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
  const attempt = attempts.latest(row.id);
  const raw = JSON.parse(row.spec);
  // Answers (and Speaking questions) are only sent once the learner has submitted.
  // Writing tasks are open from the start, as in the real booklet.
  const test =
    row.kind === "writing"
      ? writingTestSchema.parse(raw)
      : row.kind === "speaking"
        ? attempt
          ? speakingTestSchema.parse(raw)
          : toSpeakingCandidate(speakingTestSchema.parse(raw))
        : attempt
          ? readingTestSchema.parse(raw)
          : toCandidate(readingTestSchema.parse(raw));
  return c.json({
    id: row.id,
    conversationId: conversations.get(row.conversation_id) ? row.conversation_id : null,
    kind: row.kind,
    test,
    attempt: attempt
      ? { ...attempt, responses: JSON.parse(attempt.responses), result: JSON.parse(attempt.result), recording: row.kind === "speaking" && !!recordingFile(attempt.id) }
      : null,
  });
});

// Generated Task 1 images (maps and process diagrams).
app.get("/api/figures/:id", (c) => {
  try {
    return c.body(readFileSync(figurePath(c.req.param("id"))), 200, { "content-type": "image/png", "cache-control": "max-age=31536000, immutable" });
  } catch {
    return c.json({ error: "Figure not found." }, 404);
  }
});

app.delete("/api/tests/:id", (c) => {
  if (!tests.get(c.req.param("id"))) return c.json({ error: "Test not found." }, 404);
  deleteTest(c.req.param("id"));
  return c.json({ ok: true });
});

// ---- Speaking recordings ----

app.put("/api/attempts/:id/recording", async (c) => {
  const id = c.req.param("id");
  if (!attempts.get(id)) return c.json({ error: "Attempt not found." }, 404);
  const ext = recordingExt(c.req.header("content-type") ?? "");
  if (!ext) return c.json({ error: "Unsupported audio type." }, 415);
  const audio = Buffer.from(await c.req.arrayBuffer());
  if (!audio.length) return c.json({ error: "The recording is empty." }, 400);
  saveRecording(id, ext, audio);
  return c.json({ ok: true });
});

/** Clear a Speaking attempt that could not be marked, so the test can be taken again. */
app.delete("/api/attempts/:id", (c) => {
  const row = attempts.get(c.req.param("id"));
  if (!row) return c.json({ error: "Attempt not found." }, 404);
  const result = JSON.parse(row.result) as { kind?: string; unmarked?: string | null };
  if ((result.kind !== "speaking" && result.kind !== "writing") || !result.unmarked) return c.json({ error: "Only an unmarked Speaking or Writing attempt can be cleared." }, 409);
  attempts.delete(row.id);
  deleteRecording(row.id);
  return c.json({ ok: true });
});

app.get("/api/attempts/:id/recording", (c) => {
  const file = recordingFile(c.req.param("id"));
  if (!file) return c.json({ error: "No recording for this attempt." }, 404);
  const audio = readFileSync(file.path);
  const range = /bytes=(\d*)-(\d*)/.exec(c.req.header("range") ?? "");
  // Browsers seek audio with range requests.
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), audio.length - 1) : audio.length - 1;
    return c.body(audio.subarray(start, end + 1), 206, {
      "content-type": file.type,
      "content-range": `bytes ${start}-${end}/${audio.length}`,
      "accept-ranges": "bytes",
    });
  }
  return c.body(audio, 200, { "content-type": file.type, "accept-ranges": "bytes" });
});

// ---- Speaking: live examiner sessions and marking ----

app.post("/api/tests/:id/speaking", async (c) => {
  const row = tests.get(c.req.param("id"));
  if (!row || row.kind !== "speaking") return c.json({ error: "Speaking test not found." }, 404);
  const { sdp } = await c.req.json<{ sdp: string }>();
  try {
    const test = speakingTestSchema.parse(JSON.parse(row.spec));
    const session = await speaking.start(row.id, test, sdp);
    // The cue card is shown in the room when Part 2 begins.
    const card = test.part2 ? { task: test.part2.task, prompts: test.part2.prompts, explain: test.part2.explain } : null;
    return c.json({ ...session, card });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 502);
  }
});

app.get("/api/speaking/:session/events", (c) =>
  streamSSE(c, async (stream) => {
    let finish = () => {};
    const closed = new Promise<void>((resolve) => (finish = resolve));
    const stop = speaking.subscribe(c.req.param("session"), (e) => {
      stream.writeSSE({ data: JSON.stringify(e) }).catch(() => {});
      if (e.type === "closed") finish();
    });
    if (!stop) return;
    stream.onAbort(finish);
    await closed;
    stop();
  }),
);

app.delete("/api/speaking/:session", async (c) => {
  await speaking.stop(c.req.param("session"));
  return c.json({ ok: true });
});

const speakingSubmission = z.object({
  transcript: z.array(transcriptLineSchema),
  metrics: speakingMetricsSchema,
  /** What the examiner said in its private assessment after the test. */
  examinerSaid: z.string().nullable().optional(),
  elapsedSec: z.number().nullable().optional(),
});

/** Save the attempt, then mark it from the examiner's spoken assessment. */
async function submitSpeaking(row: NonNullable<ReturnType<typeof tests.get>>, body: unknown) {
  const { transcript, metrics, elapsedSec, examinerSaid } = speakingSubmission.parse(body);
  const id = randomUUID();
  attempts.insert({ id, test_id: row.id, responses: JSON.stringify({ transcript, metrics, examinerSaid: examinerSaid ?? null }), result: JSON.stringify({ kind: "speaking", marking: 1, transcript }), elapsed_sec: elapsedSec ?? null });
  library.clearProgress(row.id);
  (async () => {
    let result: unknown;
    try {
      result = markSpeaking(transcript, examinerSaid ?? null);
    } catch (err) {
      console.error("speaking marking failed", (err as Error).message);
      result = { kind: "speaking", band: null, assessment: null, transcript, candidateWords: 0, examinerSaid: examinerSaid ?? null, unmarked: "Marking failed. Please take the test again." };
    }
    attempts.setResult(id, result);
    appEvents.add(row.conversation_id, "score", { testId: row.id });
    hub.notify(row.conversation_id, { type: "card", card: { kind: "score", testId: row.id } });
    const r = result as { band: number | null; unmarked: string | null };
    await hub
      .injectContext(
        row.conversation_id,
        `The learner took the Speaking test "${row.title}" (test ${row.id}). ` +
          (r.band != null ? `Estimated band ${r.band}. ` : `Not marked: ${r.unmarked} `) +
          "A score card is already shown. Use get_test_result to see the transcript and the examiner's assessment before discussing it.",
      )
      .catch((err) => console.error("inject failed", err.message));
  })();
  return { id };
}

const writingSubmission = z.object({
  responses: z.object({ "1": z.string().optional(), "2": z.string().optional() }),
  elapsedSec: z.number().nullable().optional(),
});

/** Save the essays, then mark them in the background (a text model per task, a few minutes). */
function submitWriting(row: NonNullable<ReturnType<typeof tests.get>>, body: unknown) {
  const { responses, elapsedSec } = writingSubmission.parse(body);
  const test = writingTestSchema.parse(JSON.parse(row.spec));
  const id = randomUUID();
  attempts.insert({ id, test_id: row.id, responses: JSON.stringify(responses), result: JSON.stringify({ kind: "writing", marking: 1 }), elapsed_sec: elapsedSec ?? null });
  library.clearProgress(row.id);
  (async () => {
    let result;
    try {
      result = await markWriting(codex, test, responses);
    } catch (err) {
      console.error("writing marking failed", (err as Error).message);
      result = { kind: "writing", band: null, tasks: {}, unmarked: "Marking failed. Please submit the test again." };
    }
    attempts.setResult(id, result);
    appEvents.add(row.conversation_id, "score", { testId: row.id });
    hub.notify(row.conversation_id, { type: "card", card: { kind: "score", testId: row.id } });
    await hub
      .injectContext(
        row.conversation_id,
        `The learner submitted the Writing test "${row.title}" (test ${row.id}). ` +
          (result.band != null ? `Estimated band ${result.band}. ` : `Not marked: ${result.unmarked} `) +
          "A score card is already shown. Use get_test_result to read their writing and the marker's evidence before discussing it.",
      )
      .catch((err) => console.error("inject failed", err.message));
  })();
  return { id };
}

app.post("/api/tests/:id/attempts", async (c) => {
  const row = tests.get(c.req.param("id"));
  if (!row) return c.json({ error: "Test not found." }, 404);
  if (row.kind === "writing") {
    try {
      return c.json(submitWriting(row, await c.req.json()));
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  }
  if (row.kind === "speaking") {
    try {
      return c.json(await submitSpeaking(row, await c.req.json()));
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  }
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
      const status = r.submitted_at !== null ? (r.marking ? "marking" : "scored") : answeredCount > 0 ? "in_progress" : "not_started";
      if (r.kind === "writing") {
        const t = writingTestSchema.parse(JSON.parse(spec));
        const parts = [t.task1 && `Task 1: ${task1Label(t.task1)}`, t.task2 && `Task 2: ${TASK2_NAMES[t.task2.family]}`];
        return { ...r, answeredCount, status, parts: parts.filter(Boolean), families: [] };
      }
      if (r.kind === "speaking") {
        // Only the outline: Speaking questions stay hidden until the test is taken.
        const parts = speakingParts(speakingTestSchema.parse(JSON.parse(spec)));
        return { ...r, answeredCount, status, parts: parts.map((p) => SPEAKING_PART_NAMES[p]), families: [] };
      }
      const t = JSON.parse(spec) as { passages: { title: string; blocks: { family: string }[] }[] };
      return {
        ...r,
        answeredCount,
        status,
        parts: t.passages.map((p) => p.title),
        families: [...new Set(t.passages.flatMap((p) => p.blocks.map((b) => b.family)))],
      };
    }),
  ),
);

// Analytics for the Progress page: every attempt, plus accuracy by question family.
app.get("/api/progress", (c) => {
  const rows = library.allAttempts();
  const families: Record<string, { correct: number; total: number; skill: string }> = {};
  const history = rows.flatMap((r) => {
    const result = JSON.parse(r.result);
    // Speaking still being marked, or too short to mark, has no score yet.
    if ((result.kind === "speaking" || result.kind === "writing") && result.band == null) return [];
    for (const i of result.items ?? []) {
      const f = (families[i.key.family] ??= { correct: 0, total: 0, skill: r.kind });
      f.total += 1;
      if (i.correct) f.correct += 1;
    }
    return [{ testId: r.test_id, title: r.title, skill: r.kind, mode: r.mode, raw: result.raw ?? null, total: result.total ?? null, band: result.band, submittedAt: r.submitted_at }];
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
      const turn = { effort: msg.effort, model: msg.model, fast: msg.fast };
      if (msg.type === "send") await hub.send(conversationId, msg.text, turn);
      else if (msg.type === "answer") hub.answer(msg.askId, msg.answer);
      else if (msg.type === "lateAnswer") {
        // Answers to a form nobody is waiting on any more (e.g. after a restart): remember them so the
        // form shows them, and pass them to the tutor as the next message.
        appEvents.add(conversationId, "ask_answer", { itemId: msg.itemId, answers: msg.answers, text: msg.text });
        await hub.send(conversationId, msg.text, turn);
      }
      else if (msg.type === "confirmDelete") {
        const done = answerDeleteRequest(conversationId, String(msg.requestId), msg.confirmed === true);
        if (!done) return;
        hub.notify(conversationId, { type: "delete_answer", requestId: done.request.requestId, outcome: done.outcome });
        const titles = done.request.tests.map((t) => `"${t.title}"`).join(", ");
        await hub
          .injectContext(conversationId, done.outcome === "deleted" ? `The learner confirmed in the panel; these tests are now deleted: ${titles}.` : `The learner chose to keep ${titles}; nothing was deleted.`)
          .catch((err) => console.error("inject failed", err.message));
      }
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
