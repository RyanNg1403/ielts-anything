import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { APP_HOME } from "./codex/home.ts";

mkdirSync(APP_HOME, { recursive: true });
export const db = new DatabaseSync(process.env.IELTS_DB ?? join(APP_HOME, "app.db"));

db.exec(`
  pragma journal_mode = wal;
  create table if not exists conversations (
    id text primary key,
    thread_id text not null,
    title text not null default 'New practice',
    skill text,
    created_at integer not null,
    updated_at integer not null
  );
  create table if not exists conversation_threads (
    conversation_id text not null,
    thread_id text not null,
    tools_hash text not null,
    created_at integer not null
  );
  create table if not exists tests (
    id text primary key,
    conversation_id text not null,
    kind text not null,
    mode text not null,
    title text not null,
    spec text not null,
    review text,
    created_at integer not null
  );
  create table if not exists attempts (
    id text primary key,
    test_id text not null,
    responses text not null,
    result text not null,
    elapsed_sec integer,
    submitted_at integer not null
  );
  create table if not exists progress (
    test_id text primary key,
    responses text not null,
    elapsed_sec integer not null default 0,
    updated_at integer not null
  );
  create table if not exists app_events (
    id text primary key,
    conversation_id text not null,
    kind text not null,
    payload text not null,
    created_at integer not null
  );
`);

// Added after first release: whether the learner named the chat themselves.
try {
  db.exec("alter table conversations add column custom_title integer not null default 0");
} catch {}

export type ConversationRow = {
  id: string;
  thread_id: string;
  title: string;
  skill: string | null;
  custom_title: number;
  created_at: number;
  updated_at: number;
};

export const conversations = {
  create(id: string, threadId: string) {
    const now = Date.now();
    db.prepare("insert into conversations (id, thread_id, created_at, updated_at) values (?, ?, ?, ?)").run(id, threadId, now, now);
  },
  get(id: string) {
    return db.prepare("select * from conversations where id = ?").get(id) as ConversationRow | undefined;
  },
  list() {
    return db.prepare("select * from conversations order by updated_at desc limit 200").all() as ConversationRow[];
  },
  update(id: string, fields: Partial<Pick<ConversationRow, "title" | "skill">>) {
    const row = this.get(id);
    if (!row) return;
    db.prepare("update conversations set title = ?, skill = ?, updated_at = ? where id = ?").run(
      fields.title ?? row.title,
      fields.skill ?? row.skill,
      Date.now(),
      id,
    );
  },
  rename(id: string, title: string) {
    db.prepare("update conversations set title = ?, custom_title = 1 where id = ?").run(title, id);
  },
  remove(id: string) {
    db.prepare("delete from conversations where id = ?").run(id);
    db.prepare("delete from conversation_threads where conversation_id = ?").run(id);
    db.prepare("delete from app_events where conversation_id = ?").run(id);
  },
  touch(id: string) {
    db.prepare("update conversations set updated_at = ? where id = ?").run(Date.now(), id);
  },
};

export type TestRow = {
  id: string;
  conversation_id: string;
  kind: string;
  mode: string;
  title: string;
  spec: string;
  review: string | null;
  created_at: number;
};

/** A chat may span several Codex threads: a new one starts when the app's tool set changes. */
export const conversationThreads = {
  add(conversationId: string, threadId: string, toolsHash: string) {
    db.prepare("insert into conversation_threads (conversation_id, thread_id, tools_hash, created_at) values (?, ?, ?, ?)").run(conversationId, threadId, toolsHash, Date.now());
    db.prepare("update conversations set thread_id = ? where id = ?").run(threadId, conversationId);
  },
  list(conversationId: string) {
    const rows = db.prepare("select thread_id, tools_hash from conversation_threads where conversation_id = ? order by created_at").all(conversationId) as {
      thread_id: string;
      tools_hash: string;
    }[];
    if (rows.length) return rows;
    // Chats created before thread tracking: one thread, unknown tool set.
    const c = conversations.get(conversationId);
    return c ? [{ thread_id: c.thread_id, tools_hash: "legacy" }] : [];
  },
};

export const tests = {
  insert(row: Omit<TestRow, "created_at">) {
    db.prepare("insert into tests (id, conversation_id, kind, mode, title, spec, review, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)").run(
      row.id,
      row.conversation_id,
      row.kind,
      row.mode,
      row.title,
      row.spec,
      row.review,
      Date.now(),
    );
  },
  get(id: string) {
    return db.prepare("select * from tests where id = ?").get(id) as TestRow | undefined;
  },
  /** Replace an untaken test's content in place, keeping its id (and so every card that shows it). */
  update(id: string, row: Pick<TestRow, "mode" | "title" | "spec" | "review">) {
    db.prepare("update tests set mode = ?, title = ?, spec = ?, review = ? where id = ?").run(row.mode, row.title, row.spec, row.review, id);
    db.prepare("delete from progress where test_id = ?").run(id);
  },
  /** Remove a test with its attempts and saved progress. Returns the removed attempt ids. */
  delete(id: string) {
    const ids = (db.prepare("select id from attempts where test_id = ?").all(id) as { id: string }[]).map((a) => a.id);
    db.prepare("delete from attempts where test_id = ?").run(id);
    db.prepare("delete from progress where test_id = ?").run(id);
    db.prepare("delete from tests where id = ?").run(id);
    return ids;
  },
  forConversation(conversationId: string) {
    return db.prepare("select id, kind, mode, title, created_at from tests where conversation_id = ? order by created_at").all(conversationId) as Pick<
      TestRow,
      "id" | "kind" | "mode" | "title" | "created_at"
    >[];
  },
};

export type AttemptRow = { id: string; test_id: string; responses: string; result: string; elapsed_sec: number | null; submitted_at: number };

export const attempts = {
  insert(row: Omit<AttemptRow, "submitted_at">) {
    db.prepare("insert into attempts (id, test_id, responses, result, elapsed_sec, submitted_at) values (?, ?, ?, ?, ?, ?)").run(
      row.id,
      row.test_id,
      row.responses,
      row.result,
      row.elapsed_sec,
      Date.now(),
    );
  },
  get(id: string) {
    return db.prepare("select * from attempts where id = ?").get(id) as AttemptRow | undefined;
  },
  latest(testId: string) {
    return db.prepare("select * from attempts where test_id = ? order by submitted_at desc limit 1").get(testId) as AttemptRow | undefined;
  },
  /** Replace an attempt's result (Speaking marks arrive after the submission). */
  setResult(id: string, result: unknown) {
    db.prepare("update attempts set result = ? where id = ?").run(JSON.stringify(result), id);
  },
  bestByConversation() {
    return db
      .prepare(
        "select t.conversation_id as conversation_id, max(json_extract(a.result, '$.raw')) as raw, max(json_extract(a.result, '$.band')) as band from attempts a join tests t on t.id = a.test_id group by t.conversation_id",
      )
      .all() as { conversation_id: string; raw: number; band: number | null }[];
  },
};

export type LibraryRow = {
  id: string;
  conversation_id: string;
  kind: string;
  mode: string;
  title: string;
  created_at: number;
  raw: number | null;
  total: number | null;
  band: number | null;
  submitted_at: number | null;
  /** 1 while a Speaking attempt is still being marked. */
  marking: number;
  in_progress: number;
  answered: string | null;
  spec: string;
};

export const library = {
  list() {
    return db
      .prepare(
        `select t.id, t.conversation_id, t.kind, t.mode, t.title, t.created_at, t.spec,
                json_extract(a.result, '$.raw') as raw, json_extract(a.result, '$.total') as total,
                json_extract(a.result, '$.band') as band, a.submitted_at,
                coalesce(json_extract(a.result, '$.marking'), 0) as marking,
                (p.test_id is not null) as in_progress, p.responses as answered
         from tests t
         left join attempts a on a.id = (select id from attempts where test_id = t.id order by submitted_at desc limit 1)
         left join progress p on p.test_id = t.id
         order by t.created_at desc`,
      )
      .all() as LibraryRow[];
  },
  saveProgress(testId: string, responses: unknown, elapsedSec: number) {
    db.prepare(
      "insert into progress (test_id, responses, elapsed_sec, updated_at) values (?, ?, ?, ?) on conflict(test_id) do update set responses = excluded.responses, elapsed_sec = excluded.elapsed_sec, updated_at = excluded.updated_at",
    ).run(testId, JSON.stringify(responses), elapsedSec, Date.now());
  },
  getProgress(testId: string) {
    const row = db.prepare("select responses, elapsed_sec from progress where test_id = ?").get(testId) as { responses: string; elapsed_sec: number } | undefined;
    return row ? { responses: JSON.parse(row.responses) as Record<string, string>, elapsedSec: row.elapsed_sec } : null;
  },
  clearProgress(testId: string) {
    db.prepare("delete from progress where test_id = ?").run(testId);
  },
  allAttempts() {
    return db
      .prepare("select a.result, a.submitted_at, a.elapsed_sec, t.kind, t.mode, t.title, t.id as test_id from attempts a join tests t on t.id = a.test_id order by a.submitted_at")
      .all() as { result: string; submitted_at: number; elapsed_sec: number | null; kind: string; mode: string; title: string; test_id: string }[];
  },
};

export const appEvents = {
  add(conversationId: string, kind: string, payload: unknown) {
    db.prepare("insert into app_events (id, conversation_id, kind, payload, created_at) values (?, ?, ?, ?, ?)").run(
      crypto.randomUUID(),
      conversationId,
      kind,
      JSON.stringify(payload),
      Date.now(),
    );
  },
  list(conversationId: string) {
    return (
      db.prepare("select kind, payload, created_at from app_events where conversation_id = ? order by created_at").all(conversationId) as {
        kind: string;
        payload: string;
        created_at: number;
      }[]
    ).map((r) => ({ kind: r.kind, payload: JSON.parse(r.payload), createdAt: r.created_at }));
  },
};
