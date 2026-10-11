// Shared server data with a tiny cache so cards, pages and the sidebar stay in sync.
import { useEffect, useState } from "react";
import type { ReadingTest, ReadingResult } from "@ielts/spec";

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
  status: "not_started" | "in_progress" | "scored";
  answeredCount: number;
  parts: string[];
  families: string[];
};

export type TestPayload = {
  id: string;
  /** null when the chat that made the test has been deleted. */
  conversationId: string | null;
  kind: string;
  test: ReadingTest;
  attempt: { responses: Record<string, string>; result: ReadingResult; elapsed_sec: number | null; submitted_at: number } | null;
};

export type ProgressPayload = {
  history: { testId: string; title: string; skill: string; mode: string; raw: number; total: number; band: number | null; submittedAt: number }[];
  families: Record<string, { correct: number; total: number; skill: string }>;
};

type Entry<T> = { value?: T; promise?: Promise<T>; listeners: Set<() => void> };
const cache = new Map<string, Entry<unknown>>();

function entry<T>(key: string): Entry<T> {
  let e = cache.get(key) as Entry<T> | undefined;
  if (!e) cache.set(key, (e = { listeners: new Set() }));
  return e;
}

async function load<T>(key: string): Promise<T> {
  const e = entry<T>(key);
  e.promise = fetch(key).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `Request failed (${r.status})`);
    return r.json() as Promise<T>;
  });
  e.value = await e.promise;
  e.listeners.forEach((l) => l());
  return e.value;
}

/** Re-fetch everything that matches (e.g. after a submission). */
export function invalidate(prefix: string) {
  for (const key of cache.keys()) if (key.startsWith(prefix)) load(key).catch(() => {});
}

export function useResource<T>(key: string | null): { data: T | undefined; error: string | null; reload: () => void } {
  const [, force] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!key) return;
    const e = entry<T>(key);
    const l = () => force((n) => n + 1);
    e.listeners.add(l);
    if (e.value === undefined && !e.promise) load<T>(key).catch((err) => setError(err.message));
    return () => {
      e.listeners.delete(l);
    };
  }, [key]);
  const data = key ? (entry<T>(key).value as T | undefined) : undefined;
  return { data, error, reload: () => key && load(key).catch((err) => setError(err.message)) };
}

export const useLibrary = () => useResource<LibraryItem[]>("/api/tests");
export const useTest = (id: string | null) => useResource<TestPayload>(id ? `/api/tests/${id}` : null);
export const useProgress = () => useResource<ProgressPayload>("/api/progress");

export async function renameConversation(id: string, title: string) {
  await fetch(`/api/conversations/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });
  invalidate("/api/conversations");
}

export async function deleteConversation(id: string) {
  await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  invalidate("/api/conversations");
  invalidate("/api/tests");
}

export async function submitAttempt(testId: string, responses: Record<string, string>, elapsedSec: number) {
  const r = await fetch(`/api/tests/${testId}/attempts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ responses, elapsedSec }),
  });
  if (!r.ok) throw new Error("Submitting failed. Your answers are saved; try again.");
  invalidate("/api/tests");
  invalidate("/api/progress");
  invalidate("/api/conversations");
  return r.json();
}

export function saveProgress(testId: string, responses: Record<string, string>, elapsedSec: number) {
  return fetch(`/api/tests/${testId}/progress`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ responses, elapsedSec }),
  });
}

export async function loadProgress(testId: string): Promise<{ responses: Record<string, string>; elapsedSec: number } | null> {
  return (await fetch(`/api/tests/${testId}/progress`)).json();
}
