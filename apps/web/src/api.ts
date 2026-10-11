import { useCallback, useEffect, useRef, useState } from "react";
import { decodeMessage } from "./skills.ts";
import { invalidate } from "./data.ts";
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
  | { kind: "user"; id: string; text: string; skill: string | null; mode: string | null }
  | { kind: "agent"; id: string; text: string }
  | { kind: "ask"; id: string; askId: string | null; questions: Question[]; answers: Record<string, string[]> | null }
  | { kind: "card"; id: string; card: Card }
  | { kind: "work"; id: string; steps: Step[]; startedAt: number | null; endedAt: number | null }
  | { kind: "error"; id: string; message: string };

export async function createConversation(): Promise<string> {
  const { id } = await (await fetch("/api/conversations", { method: "POST" })).json();
  invalidate("/api/conversations");
  return id;
}

const ms = (t: number | null | undefined) => (t == null ? null : t < 1e12 ? t * 1000 : t);

/** Turn Codex thread history (plus app events such as score cards) into chat entries. */
function entriesFromHistory(turns: any[], events: { kind: string; payload: any; createdAt: number }[]): Entry[] {
  const out: Entry[] = [];
  const pending = [...events];
  const flushBefore = (time: number | null) => {
    while (pending.length && (time === null || pending[0]!.createdAt <= time)) {
      const e = pending.shift()!;
      if (e.kind === "score") out.push({ kind: "card", id: `event-${e.createdAt}`, card: { kind: "score", testId: e.payload.testId } });
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
        out.push({ kind: "user", id: item.id, text, skill, mode });
        if (!placed && steps.length) {
          out.push(work);
          placed = true;
        }
      } else if (item.type === "agentMessage" && item.text) {
        out.push({ kind: "agent", id: item.id, text: item.text });
      } else if (item.type === "dynamicToolCall") {
        const entry = entryFromToolCall(item);
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
    case "reading_finalize": {
      const m = resultText.match(/test ([0-9a-f-]{36})/);
      return item.success && m ? { kind: "card", id: item.id, card: { kind: "test", testId: m[1]! } } : null;
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

export type Activity = { label: string } | null;

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
  const ws = useRef<WebSocket | null>(null);
  const queued = useRef<string[]>([]);
  const sentFirst = useRef<string | null>(null);
  const thoughts = useRef<Record<string, string>>({});

  useEffect(() => {
    setEntries([]);
    setBusy(false);
    setActivity(null);
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
        queued.current.push(JSON.stringify({ type: "send", text: first }));
      }
    }

    fetch(`/api/conversations/${conversationId}/history`)
      .then((r) => r.json())
      .then(({ turns, events }) => {
        if (cancelled) return;
        // Live events may already have arrived for a brand-new conversation; keep them.
        setEntries((live) => (live.length ? live : entriesFromHistory(turns ?? [], events ?? [])));
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
          if (e.phase === "completed" && it.type === "dynamicToolCall" && it.tool === "reading_finalize" && it.success) invalidate("/api/tests");
          return;
        }
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
        case "card":
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
    (raw: string, effort?: string) => {
      const { text, skill, mode } = decodeMessage(raw);
      setEntries((xs) => [...xs, { kind: "user", id: crypto.randomUUID(), text, skill, mode }]);
      setBusy(true);
      setActivity({ label: "Thinking" });
      post({ type: "send", text: raw, effort });
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

  const interrupt = useCallback(() => post({ type: "interrupt" }), [post]);

  const markAnswered = useCallback((id: string, answers: Record<string, string[]>) => {
    setEntries((xs) => xs.map((x) => (x.kind === "ask" && x.id === id ? { ...x, answers } : x)));
  }, []);

  return { entries, busy, activity, send, answer, interrupt, markAnswered };
}

/** Start a new chat and send a first message (e.g. "Make me a drill on ..."). */
export async function startChatWith(text: string) {
  const id = await createConversation();
  sessionStorage.setItem(`draft:${id}`, text);
  location.hash = `#/chat/${id}`;
}
