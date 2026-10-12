// Shared server data with a tiny cache so cards, pages and the sidebar stay in sync.
import { useEffect, useState } from "react";
import type { ReadingTest, ReadingResult, SpeakingCandidate, SpeakingResult, SpeakingTest, WritingResult, WritingTest } from "@ielts/spec";

export type LibraryItem = {
  id: string;
  conversation_id: string;
  kind: "reading" | "listening" | "writing" | "speaking";
  mode: "full" | "drill";
  title: string;
  created_at: number;
  raw: number | null;
  total: number | null;
  band: number | null;
  submitted_at: number | null;
  status: "not_started" | "in_progress" | "marking" | "scored";
  answeredCount: number;
  parts: string[];
  families: string[];
};

type PayloadBase = {
  id: string;
  /** null when the chat that made the test has been deleted. */
  conversationId: string | null;
};

export type ReadingPayload = PayloadBase & {
  kind: "reading";
  test: ReadingTest;
  attempt: { responses: Record<string, string>; result: ReadingResult; elapsed_sec: number | null; submitted_at: number } | null;
};

/** Before the test is taken the learner only gets the outline; questions arrive with the result. */
export type SpeakingPayload = PayloadBase & {
  kind: "speaking";
  test: SpeakingCandidate | SpeakingTest;
  attempt: { id: string; result: SpeakingResult | { kind: "speaking"; marking: 1 }; elapsed_sec: number | null; submitted_at: number; recording?: boolean } | null;
};

export type WritingPayload = PayloadBase & {
  kind: "writing";
  test: WritingTest;
  attempt: { id: string; responses: { "1"?: string; "2"?: string }; result: WritingResult | { kind: "writing"; marking: 1 }; elapsed_sec: number | null; submitted_at: number } | null;
};

export type TestPayload = ReadingPayload | SpeakingPayload | WritingPayload;

export const isMarking = (a: SpeakingPayload["attempt"] | WritingPayload["attempt"]): boolean => !!a && "marking" in a.result;

export type ProgressPayload = {
  history: { testId: string; title: string; skill: string; mode: string; raw: number; total: number; band: number | null; submittedAt: number }[];
  families: Record<string, { correct: number; total: number; skill: string }>;
};

type Entry<T> = { value?: T; error?: string; promise?: Promise<T>; listeners: Set<() => void> };
const cache = new Map<string, Entry<unknown>>();

function entry<T>(key: string): Entry<T> {
  let e = cache.get(key) as Entry<T> | undefined;
  if (!e) cache.set(key, (e = { listeners: new Set() }));
  return e;
}

async function load<T>(key: string): Promise<T> {
  const e = entry<T>(key);
  e.promise = fetch(key).then(async (r) => {
    if (!r.ok) throw Object.assign(new Error((await r.json().catch(() => null))?.error ?? `Request failed (${r.status})`), { status: r.status });
    return r.json() as Promise<T>;
  });
  try {
    e.value = await e.promise;
    e.error = undefined;
    return e.value;
  } catch (err) {
    // A resource that is gone (e.g. a deleted test) must not keep showing its last value.
    if ((err as { status?: number }).status === 404 || e.value === undefined) {
      e.value = undefined;
      e.error = (err as Error).message;
    }
    throw err;
  } finally {
    e.listeners.forEach((l) => l());
  }
}

/** Re-fetch everything that matches (e.g. after a submission). */
export function invalidate(prefix: string) {
  for (const key of cache.keys()) if (key.startsWith(prefix)) load(key).catch(() => {});
}

export function useResource<T>(key: string | null): { data: T | undefined; error: string | null; reload: () => void } {
  const [, force] = useState(0);
  useEffect(() => {
    if (!key) return;
    const e = entry<T>(key);
    const l = () => force((n) => n + 1);
    e.listeners.add(l);
    if (e.value === undefined && !e.promise) load<T>(key).catch(() => {});
    return () => {
      e.listeners.delete(l);
    };
  }, [key]);
  const e = key ? entry<T>(key) : null;
  return { data: e?.value, error: e?.error ?? null, reload: () => key && load(key).catch(() => {}) };
}

export const useLibrary = () => useResource<LibraryItem[]>("/api/tests");
export const useTest = (id: string | null) => useResource<TestPayload>(id ? `/api/tests/${id}` : null);
export const useProgress = () => useResource<ProgressPayload>("/api/progress");

export async function renameConversation(id: string, title: string) {
  await fetch(`/api/conversations/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });
  invalidate("/api/conversations");
}

export async function deleteTest(id: string) {
  const res = await fetch(`/api/tests/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error((await res.json().catch(() => null))?.error ?? "Deleting failed.");
  invalidate("/api/tests");
  invalidate("/api/progress");
  invalidate("/api/conversations");
}

/** Clear an unmarked Speaking attempt so its test can be taken again. */
export async function retakeSpeaking(testId: string, attemptId: string) {
  const res = await fetch(`/api/attempts/${attemptId}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Clearing the attempt failed.");
  invalidate(`/api/tests/${testId}`);
  invalidate("/api/tests");
  invalidate("/api/progress");
}

/** Clear an unmarked Writing attempt so its test can be taken again. */
export const retakeWriting = retakeSpeaking;

export async function deleteConversation(id: string) {
  await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  invalidate("/api/conversations");
  invalidate("/api/tests");
}

export async function submitWriting(testId: string, responses: { "1"?: string; "2"?: string }, elapsedSec: number) {
  const r = await fetch(`/api/tests/${testId}/attempts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ responses, elapsedSec }),
  });
  if (!r.ok) throw new Error("Submitting failed. Try again; your writing is still here.");
  invalidate(`/api/tests/${testId}`);
  invalidate("/api/tests");
  invalidate("/api/progress");
  invalidate("/api/conversations");
}

export async function submitAttempt(testId: string, responses: Record<string, string>, elapsedSec: number) {
  const r = await fetch(`/api/tests/${testId}/attempts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ responses, elapsedSec }),
  });
  if (!r.ok) throw new Error("Submitting failed. Try again; your answers are still here.");
  invalidate("/api/tests");
  invalidate("/api/progress");
  invalidate("/api/conversations");
  return r.json();
}
