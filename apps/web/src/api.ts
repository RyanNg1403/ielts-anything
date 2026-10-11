import { useCallback, useEffect, useRef, useState } from "react";
import { decodeMessage } from "./skills.ts";

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

export type Entry =
  | { kind: "user"; id: string; text: string; skill: string | null; mode: string | null }
  | { kind: "agent"; id: string; text: string }
  | { kind: "ask"; id: string; askId: string | null; questions: Question[]; answers: Record<string, string[]> | null }
  | { kind: "card"; id: string; card: BriefCard }
  | { kind: "error"; id: string; message: string };

export async function listConversations(): Promise<Conversation[]> {
  return (await fetch("/api/conversations")).json();
}

export async function createConversation(): Promise<string> {
  const { id } = await (await fetch("/api/conversations", { method: "POST" })).json();
  return id;
}

/** Turn Codex thread history into chat entries. */
function entriesFromTurns(turns: any[]): Entry[] {
  const out: Entry[] = [];
  for (const turn of turns) {
    for (const item of turn.items ?? []) {
      if (item.type === "userMessage") {
        const raw = item.content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") ?? "";
        const { text, skill, mode } = decodeMessage(raw);
        out.push({ kind: "user", id: item.id, text, skill, mode });
      } else if (item.type === "agentMessage" && item.text) {
        out.push({ kind: "agent", id: item.id, text: item.text });
      } else if (item.type === "dynamicToolCall") {
        const entry = entryFromToolCall(item);
        if (entry) out.push(entry);
      }
    }
  }
  return out;
}

function entryFromToolCall(item: any): Entry | null {
  if (item.tool === "show_brief") return { kind: "card", id: item.id, card: { kind: "brief", ...item.arguments } };
  if (item.tool === "ask_learner") {
    let answers: Record<string, string[]> | null = null;
    try {
      answers = JSON.parse(item.contentItems?.[0]?.text ?? "null")?.answers ?? null;
    } catch {}
    return { kind: "ask", id: item.id, askId: null, questions: item.arguments.questions, answers };
  }
  return null;
}

export type Activity = { label: string } | null;

export function useConversation(conversationId: string | null, initial?: { current: string | null }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<Activity>(null);
  const ws = useRef<WebSocket | null>(null);
  const queued = useRef<string[]>([]);
  const sentFirst = useRef<string | null>(null);

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
      .then((turns) => {
        if (cancelled) return;
        // Live events may already have arrived for a brand-new conversation; keep them.
        setEntries((live) => (live.length ? live : entriesFromTurns(turns)));
      });

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
          if (e.status !== "inProgress") setActivity(null);
          if (e.status === "failed")
            setEntries((xs) => [...xs, { kind: "error", id: crypto.randomUUID(), message: e.error?.message ?? "The turn failed." }]);
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
        case "thinking":
          return setActivity({ label: "Thinking" });
        case "item": {
          const it = e.item;
          if (e.phase === "started") {
            if (it.type === "commandExecution") setActivity({ label: "Reading the exam guidelines" });
            else if (it.type === "dynamicToolCall" && it.tool !== "ask_learner") setActivity({ label: "Preparing your practice" });
            else if (it.type === "webSearch") setActivity({ label: "Looking things up" });
          }
          if (e.phase === "completed" && it.type === "agentMessage") {
            setEntries((xs) => xs.map((x) => (x.kind === "agent" && x.id === it.id ? { ...x, text: it.text } : x)));
          }
          if (e.phase === "completed" && it.type === "dynamicToolCall" && it.tool === "ask_learner") {
            const done = entryFromToolCall(it);
            if (done && done.kind === "ask")
              setEntries((xs) => xs.map((x) => (x.kind === "ask" && x.answers === null ? { ...x, answers: done.answers } : x)));
          }
          return;
        }
        case "ask":
          setActivity(null);
          return setEntries((xs) => [...xs, { kind: "ask", id: e.askId, askId: e.askId, questions: e.questions, answers: null }]);
        case "card":
          return setEntries((xs) => [...xs, { kind: "card", id: crypto.randomUUID(), card: e.card }]);
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

  return { entries, busy, activity, send, answer, interrupt };
}
