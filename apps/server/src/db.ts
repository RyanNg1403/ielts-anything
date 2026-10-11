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
`);

export type ConversationRow = {
  id: string;
  thread_id: string;
  title: string;
  skill: string | null;
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
  touch(id: string) {
    db.prepare("update conversations set updated_at = ? where id = ?").run(Date.now(), id);
  },
};
