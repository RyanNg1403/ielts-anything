import { useCallback, useEffect, useRef, useState } from "react";
import { decodeMessage } from "./skills.ts";
import { invalidate } from "./data.ts";
import { getAgentSettings } from "./agent.ts";

/** Model, thinking effort and speed chosen in the composer, sent with every turn. */
function turnSettings() {
  const { model, effort, fast } = getAgentSettings();
  return { model: model ?? undefined, effort: effort ?? undefined, fast };
}
import { splitSummary, stepFromItem, type Step } from "./work.ts";

export type Conversation = { id: string; title: string; skill: string | null; updated_at: number };

export type Question = {
  id: string;
  header: string;
  question: string;
  options: { label: string; description?: string }[];
  multiSelect: boolean;
  allowOther: boolean;
};

export type BriefCard = {
  kind: "brief";
  skill: "reading" | "listening" | "writing" | "speaking";
  mode: "full" | "drill";
  title: string;
  topic: string;
  outline: string[];
  questionTypes: string[];
  estimatedMinutes: number;
};

export type Card =
  | BriefCard
  | { kind: "test"; testId: string }
  | { kind: "score"; testId: string }
  | { kind: "explain"; testId: string; items: { q: number; explanation: string }[] };

export type Entry =
  | { kind: "user"; id: string; text: string; skill: string | null; mode: string | null; spoken?: boolean }
  | { kind: "agent"; id: string; text: string; spoken?: boolean }
  | { kind: "ask"; id: string; askId: string | null; questions: Question[]; answers: Record<string, string[]> | null }
  | { kind: "confirm"; id: string; requestId: string; tests: DeleteCandidate[]; outcome: "deleted" | "kept" | null }
  | { kind: "card"; id: string; card: Card }
  | { kind: "work"; id: string; steps: Step[]; startedAt: number | null; endedAt: number | null }
  | { kind: "error"; id: string; message: string };

/** A test the tutor wants to delete, as listed in the confirmation panel. */
export type DeleteCandidate = { testId: string; title: string; skill: string; taken: boolean };

function deleteRequest(resultText: string): { requestId: string; tests: DeleteCandidate[] } | null {
  try {
    const r = JSON.parse(resultText);
    return typeof r?.requestId === "string" && Array.isArray(r.tests) ? r : null;
  } catch {
    return null;
  }
}

/** Deleting changes the library, scores and chat list. */
function refreshAfterDelete() {
  invalidate("/api/tests");
  invalidate("/api/progress");
  invalidate("/api/conversations");
}

export async function createConversation(): Promise<string> {
  const { id } = await (await fetch("/api/conversations", { method: "POST" })).json();
  invalidate("/api/conversations");
  return id;
}

const ms = (t: number | null | undefined) => (t == null ? null : t < 1e12 ? t * 1000 : t);

/** Turn Codex thread history (plus app events such as score cards) into chat entries. */
function entriesFromHistory(turns: any[], events: { kind: string; payload: any; createdAt: number }[]): Entry[] {
  const out: Entry[] = [];
  const late = new Map(events.filter((e) => e.kind === "ask_answer").map((e) => [e.payload.itemId as string, e.payload]));
  const deleteAnswers = new Map(events.filter((e) => e.kind === "delete_answer").map((e) => [e.payload.requestId as string, e.payload.outcome]));
  const lateTexts = new Set([...late.values()].map((p) => p.text as string));
  const pending = events.filter((e) => e.kind !== "ask_answer");
  const flushBefore = (time: number | null) => {
    while (pending.length && (time === null || pending[0]!.createdAt <= time)) {
      const e = pending.shift()!;
      if (e.kind === "score") out.push({ kind: "card", id: `event-${e.createdAt}`, card: { kind: "score", testId: e.payload.testId } });
      if (e.kind === "voice") out.push(spokenEntry(e.payload.role, e.payload.text, `voice-${e.createdAt}`));
    }
  };
  for (const turn of turns) {
    flushBefore(ms(turn.startedAt));
    const steps = (turn.items ?? []).map((i: any) => stepFromItem(i, "completed")).filter(Boolean) as Step[];
    const work: Entry = { kind: "work", id: turn.id, steps, startedAt: ms(turn.startedAt), endedAt: ms(turn.completedAt) ?? ms(turn.startedAt) };
    let placed = false;
    for (const item of turn.items ?? []) {
      if (item.type === "userMessage") {
        const raw = item.content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") ?? "";
        const { text, skill, mode } = decodeMessage(raw);
        // Late form answers are shown in their form, not as a message.
        if (lateTexts.delete(raw)) continue;
        out.push({ kind: "user", id: item.id, text, skill, mode });
        if (!placed && steps.length) {
          out.push(work);
          placed = true;
        }
      } else if (item.type === "agentMessage" && item.text) {
        out.push({ kind: "agent", id: item.id, text: item.text });
      } else if (item.type === "dynamicToolCall") {
        const entry = entryFromToolCall(item);
        if (entry?.kind === "ask" && entry.answers === null && late.has(item.id)) entry.answers = late.get(item.id).answers;
        if (entry?.kind === "confirm") entry.outcome = deleteAnswers.get(entry.requestId) ?? null;
        if (entry) out.push(entry);
      }
    }
    if (!placed && steps.length) out.push(work);
  }
  flushBefore(null);
  return out;
}

function entryFromToolCall(item: any): Entry | null {
  const args = item.arguments ?? {};
  const resultText: string = item.contentItems?.[0]?.text ?? "";
  switch (item.tool) {
    case "show_brief":
      return { kind: "card", id: item.id, card: { kind: "brief", ...args } };
    case "start_test":
    case "show_test":
      return item.success ? { kind: "card", id: item.id, card: { kind: "test", testId: args.testId } } : null;
    case "show_score":
      return item.success ? { kind: "card", id: item.id, card: { kind: "score", testId: args.testId } } : null;
    case "explain_questions":
      return item.success ? { kind: "card", id: item.id, card: { kind: "explain", testId: args.testId, items: args.items } } : null;
    case "speaking_publish":
    case "reading_finalize": {
      const m = resultText.match(/test ([0-9a-f-]{36})/);
      return item.success && m ? { kind: "card", id: item.id, card: { kind: "test", testId: m[1]! } } : null;
    }
    case "delete_tests": {
      const request = item.success ? deleteRequest(resultText) : null;
      return request ? { kind: "confirm", id: item.id, requestId: request.requestId, tests: request.tests, outcome: null } : null;
    }
    case "ask_learner": {
      let answers: Record<string, string[]> | null = null;
      try {
        answers = JSON.parse(resultText || "null")?.answers ?? null;
      } catch {}
      return { kind: "ask", id: item.id, askId: null, questions: args.questions, answers };
    }
  }
  return null;
}

function spokenEntry(role: string, text: string, id: string): Entry {
  return role === "user" ? { kind: "user", id, text, skill: null, mode: null, spoken: true } : { kind: "agent", id, text, spoken: true };
}

export type Activity = { label: string } | null;
export type Caption = { role: string; text: string } | null;

/** Add or update a step in the work log of the given turn (creating the log if needed). */
function upsertStep(xs: Entry[], turnId: string | undefined, step: Step, keepLabel = false): Entry[] {
  let i = turnId ? xs.findIndex((x) => x.kind === "work" && x.id === turnId) : -1;
  if (i === -1) i = xs.findLastIndex((x) => x.kind === "work");
  if (i === -1) return xs;
  const work = xs[i] as Extract<Entry, { kind: "work" }>;
  const at = work.steps.findIndex((s) => s.id === step.id);
  const steps = work.steps.slice();
  if (at === -1) steps.push(step);
  else steps[at] = keepLabel ? { ...steps[at]!, status: step.status } : { ...steps[at]!, ...step };
  const copy = xs.slice();
  copy[i] = { ...work, steps };
  return copy;
}

export function useConversation(conversationId: string | null, initial?: { current: string | null }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<Activity>(null);
  // What is being said right now in a voice conversation, before it becomes a message.
  const [caption, setCaption] = useState<Caption>(null);
  const [voiceEnded, setVoiceEnded] = useState(0);
  const ws = useRef<WebSocket | null>(null);
  const queued = useRef<string[]>([]);
  const sentFirst = useRef<string | null>(null);
  const thoughts = useRef<Record<string, string>>({});

  useEffect(() => {
    setEntries([]);
    setBusy(false);
    setActivity(null);
    setCaption(null);
    if (!conversationId) return;
    let cancelled = false;

    // A brand-new conversation is created by the first message; send it once the socket is up.
    // The ref is checked (not cleared) so StrictMode's double effect run keeps the entry.
    const first = initial?.current;
    if (first) {
      const { text, skill, mode } = decodeMessage(first);
      setEntries([{ kind: "user", id: "first", text, skill, mode }]);
      setBusy(true);
      setActivity({ label: "Thinking" });
      if (sentFirst.current !== conversationId) {
        sentFirst.current = conversationId;
        queued.current.push(JSON.stringify({ type: "send", text: first, ...turnSettings() }));
      }
    }

    fetch(`/api/conversations/${conversationId}/history`)
      .then((r) => r.json())
      .then(({ turns, events }) => {
        if (cancelled) return;
        // Live events may already have arrived for a brand-new conversation; keep them. A form still
        // waiting for the learner is replayed on connect: attach it to the history.
        setEntries((live) => {
          const history = entriesFromHistory(turns ?? [], events ?? []);
          if (!live.length) return history;
          if (!live.every((x) => x.kind === "ask" && x.askId)) return live;
          const merged = history.slice();
          for (const x of live) {
            const stale = merged.findLastIndex((h) => h.kind === "ask" && h.askId === null && h.answers === null);
            if (stale === -1) merged.push(x);
            else merged[stale] = { ...x, id: merged[stale]!.id } as Entry;
          }
          return merged;
        });
        if ((turns ?? []).some((t: any) => t.status === "inProgress")) {
          setBusy(true);
          setActivity((a) => a ?? { label: "Working" });
        }
      })
      .catch(() => {});

    const socket = new WebSocket(`${location.origin.replace("http", "ws")}/ws?conversation=${conversationId}`);
    ws.current = socket;
    socket.onopen = () => {
      for (const msg of queued.current.splice(0)) socket.send(msg);
    };
    socket.onmessage = (ev) => onEvent(JSON.parse(ev.data));
    return () => {
      cancelled = true;
      socket.close();
      ws.current = null;
    };

    function onEvent(e: any) {
      switch (e.type) {
        case "turn":
          setBusy(e.status === "inProgress");
          if (e.status === "inProgress") setActivity(null);
          // The first message names the chat; show it in the sidebar straight away.
          if (e.status === "inProgress") invalidate("/api/conversations");
          if (e.status === "inProgress")
            setEntries((xs) => (xs.some((x) => x.kind === "work" && x.id === e.turnId) ? xs : [...xs, { kind: "work", id: e.turnId, steps: [], startedAt: e.startedAt ?? Date.now(), endedAt: null }]));
          else
            setEntries((xs) =>
              xs.map((x) =>
                x.kind === "work" && x.id === e.turnId
                  ? { ...x, endedAt: Date.now(), steps: x.steps.map((st) => (st.status === "running" ? { ...st, status: "done" as const } : st)) }
                  : x,
              ),
            );
          if (e.status !== "inProgress") {
            setActivity(null);
            invalidate("/api/conversations");
          }
          if (e.status === "failed")
            setEntries((xs) => [
              ...xs,
              { kind: "error", id: crypto.randomUUID(), message: e.error?.message ?? "The tutor stopped because of an error. Send your message again." },
            ]);
          return;
        case "delta":
          setActivity(null);
          return setEntries((xs) => {
            const i = xs.findIndex((x) => x.kind === "agent" && x.id === e.itemId);
            if (i === -1) return [...xs, { kind: "agent", id: e.itemId, text: e.delta }];
            const copy = xs.slice();
            const prev = copy[i] as Extract<Entry, { kind: "agent" }>;
            copy[i] = { ...prev, text: prev.text + e.delta };
            return copy;
          });
        case "thinking": {
          setActivity(null);
          const text = (thoughts.current[e.itemId] = (thoughts.current[e.itemId] ?? "") + e.delta);
          return setEntries((xs) => upsertStep(xs, e.turnId, { id: e.itemId, kind: "think", ...splitSummary(text), status: "running" }));
        }
        case "progress":
          return;
        case "item": {
          const it = e.item;
          const step = stepFromItem(it, e.phase);
          if (!step && it.type === "reasoning" && !thoughts.current[it.id])
            setEntries((xs) => xs.map((x) => (x.kind === "work" ? { ...x, steps: x.steps.filter((st) => st.id !== it.id) } : x)));
          if (step) {
            setActivity(null);
            // A reasoning item's label comes from its streamed summary; don't reset it to "Thinking".
            const streamed = it.type === "reasoning" && thoughts.current[it.id];
            setEntries((xs) => upsertStep(xs, e.turnId, step, !!streamed));
          }
          if (e.phase === "completed" && it.type === "agentMessage") {
            setEntries((xs) => xs.map((x) => (x.kind === "agent" && x.id === it.id ? { ...x, text: it.text } : x)));
          }
          if (e.phase === "completed" && it.type === "dynamicToolCall" && it.tool === "ask_learner") {
            const done = entryFromToolCall(it);
            if (done && done.kind === "ask")
              setEntries((xs) => xs.map((x) => (x.kind === "ask" && x.answers === null ? { ...x, answers: done.answers } : x)));
          }
          // A test was published or changed in place: refresh every view of it.
          if (e.phase === "completed" && it.type === "dynamicToolCall" && (it.tool === "reading_finalize" || it.tool === "speaking_publish") && it.success)
            invalidate("/api/tests");
          return;
        }
        case "confirm_delete":
          return setEntries((xs) =>
            xs.some((x) => x.kind === "confirm" && x.requestId === e.requestId) ? xs : [...xs, { kind: "confirm", id: e.requestId, requestId: e.requestId, tests: e.tests, outcome: null }],
          );
        case "delete_answer":
          if (e.outcome === "deleted") refreshAfterDelete();
          return setEntries((xs) => xs.map((x) => (x.kind === "confirm" && x.requestId === e.requestId ? { ...x, outcome: e.outcome } : x)));
        case "ask":
          setActivity(null);
          return setEntries((xs) => {
            if (xs.some((x) => x.kind === "ask" && x.askId === e.askId)) return xs;
            const stale = xs.findLastIndex((x) => x.kind === "ask" && x.answers === null && x.askId === null);
            const entry: Entry = { kind: "ask", id: e.askId, askId: e.askId, questions: e.questions, answers: null };
            if (stale === -1) return [...xs, entry];
            const copy = xs.slice();
            copy[stale] = entry;
            return copy;
          });
        case "voice":
          if (e.event === "delta") return setCaption((c) => (c && c.role === e.role ? { role: e.role, text: c.text + e.delta } : { role: e.role, text: e.delta }));
          if (e.event === "done") {
            setCaption(null);
            if (e.text?.trim()) setEntries((xs) => [...xs, spokenEntry(e.role, e.text, crypto.randomUUID())]);
            return;
          }
          if (e.event === "closed") {
            setCaption(null);
            setVoiceEnded((n) => n + 1);
          }
          if (e.event === "error") setEntries((xs) => [...xs, { kind: "error", id: crypto.randomUUID(), message: e.message }]);
          return;
        case "card":
          // A score card means the test's result changed (Speaking marks arrive later).
          if (e.card.kind === "score") {
            invalidate(`/api/tests/${e.card.testId}`);
            invalidate("/api/tests");
          }
          return setEntries((xs) => [...xs, { kind: "card", id: crypto.randomUUID(), card: e.card }]);
        case "open":
          // The tutor started a test: switch to it (live events only, never on history replay).
          if (e.route?.name === "test") location.hash = `#/test/${e.route.id}`;
          return;
        case "error":
          if (e.willRetry) return;
          return setEntries((xs) => [...xs, { kind: "error", id: crypto.randomUUID(), message: e.message }]);
      }
    }
  }, [conversationId]);

  const post = useCallback((msg: unknown) => {
    const raw = JSON.stringify(msg);
    const socket = ws.current;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(raw);
    else queued.current.push(raw);
  }, []);

  const send = useCallback(
    (raw: string) => {
      const { text, skill, mode } = decodeMessage(raw);
      setEntries((xs) => [...xs, { kind: "user", id: crypto.randomUUID(), text, skill, mode }]);
      setBusy(true);
      setActivity({ label: "Thinking" });
      post({ type: "send", text: raw, ...turnSettings() });
    },
    [post],
  );

  const answer = useCallback(
    (askId: string, answers: Record<string, string[]>) => {
      setEntries((xs) => xs.map((x) => (x.kind === "ask" && x.askId === askId ? { ...x, answers } : x)));
      setActivity({ label: "Thinking" });
      post({ type: "answer", askId, answer: answers });
    },
    [post],
  );

  /** The panel decides by itself; the tutor is told afterwards. */
  const confirmDelete = useCallback(
    (requestId: string, confirmed: boolean) => {
      setEntries((xs) => xs.map((x) => (x.kind === "confirm" && x.requestId === requestId ? { ...x, outcome: confirmed ? "deleted" : "kept" } : x)));
      post({ type: "confirmDelete", requestId, confirmed });
    },
    [post],
  );

  const interrupt = useCallback(() => post({ type: "interrupt" }), [post]);

  /** Answer a form whose tool call has ended (e.g. the app restarted): the tutor gets it as the next message. */
  const answerLate = useCallback(
    (itemId: string, answers: Record<string, string[]>, text: string) => {
      setEntries((xs) => xs.map((x) => (x.kind === "ask" && x.id === itemId ? { ...x, answers } : x)));
      setBusy(true);
      setActivity({ label: "Thinking" });
      post({ type: "lateAnswer", itemId, answers, text, ...turnSettings() });
    },
    [post],
  );

  return { entries, busy, activity, caption, voiceEnded, send, answer, confirmDelete, interrupt, answerLate };
}

/** Start a new chat and send a first message (e.g. "Make me a drill on ..."). */
export async function startChatWith(text: string) {
  const id = await createConversation();
  sessionStorage.setItem(`draft:${id}`, text);
  location.hash = `#/chat/${id}`;
}
