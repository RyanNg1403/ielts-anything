// Connects browser sessions to Codex threads: starts threads, forwards turn events,
// and answers Codex's server requests (dynamic tool calls, user input).
import { randomUUID } from "node:crypto";
import { CodexAppServer, type Notification, type ServerRequest } from "./codex/app-server.ts";
import { createHash } from "node:crypto";
import { conversationThreads, conversations } from "./db.ts";
import { DEVELOPER_INSTRUCTIONS } from "./instructions.ts";
import type { ToolRegistry } from "./tools/registry.ts";
import { WORKSPACE } from "./codex/home.ts";

export type ClientEvent = Record<string, unknown> & { type: string };
type Listener = (event: ClientEvent) => void;
type PendingAsk = { conversationId: string; resolve: (answer: unknown) => void; event: ClientEvent };

export class Hub {
  private listeners = new Map<string, Set<Listener>>();
  private threadToConversation = new Map<string, string>();
  private pendingAsks = new Map<string, PendingAsk>();
  private loadedThreads = new Set<string>();
  private activeTurns = new Map<string, string>();

  constructor(
    private readonly codex: CodexAppServer,
    private readonly tools: ToolRegistry,
  ) {
    codex.on("notification", (n) => this.onNotification(n));
    codex.onServerRequest((req) => this.onServerRequest(req));
  }

  subscribe(conversationId: string, listener: Listener) {
    let set = this.listeners.get(conversationId);
    if (!set) this.listeners.set(conversationId, (set = new Set()));
    set.add(listener);
    // A reopened chat must still be able to answer a question the tutor is waiting on.
    for (const p of this.pendingAsks.values()) if (p.conversationId === conversationId) listener(p.event);
    return () => set.delete(listener);
  }

  /** Push an app-originated event (e.g. a score card after submission) to open chats. */
  notify(conversationId: string, event: ClientEvent) {
    this.emit(conversationId, event);
  }

  /** Tell the tutor about something that happened outside the chat, without starting a turn. */
  async injectContext(conversationId: string, text: string) {
    if (!conversations.get(conversationId)) return;
    const threadId = await this.activeThread(conversationId);
    await this.codex.request("thread/inject_items", {
      threadId,
      items: [{ type: "message", role: "user", content: [{ type: "input_text", text: `[App event, not typed by the learner] ${text}` }] }],
    });
  }

  private emit(conversationId: string, event: ClientEvent) {
    for (const l of this.listeners.get(conversationId) ?? []) l(event);
  }

  /** Delete a chat: archive its Codex threads and forget it. Its tests stay in the library. */
  async deleteConversation(conversationId: string) {
    await this.interrupt(conversationId).catch(() => {});
    for (const { thread_id } of conversationThreads.list(conversationId)) {
      await this.codex.request("thread/archive", { threadId: thread_id }).catch(() => {});
      this.threadToConversation.delete(thread_id);
      this.loadedThreads.delete(thread_id);
    }
    for (const [id, p] of this.pendingAsks) if (p.conversationId === conversationId) this.pendingAsks.delete(id);
    conversations.remove(conversationId);
  }

  /** Fingerprint of the tools and instructions a thread is started with. */
  private get toolsHash() {
    return createHash("sha256").update(JSON.stringify([this.tools.specs(), DEVELOPER_INSTRUCTIONS])).digest("hex").slice(0, 16);
  }

  private async startThread() {
    const { thread } = await this.codex.request("thread/start", {
      cwd: WORKSPACE,
      sandbox: "read-only",
      approvalPolicy: "never",
      developerInstructions: DEVELOPER_INSTRUCTIONS,
      dynamicTools: this.tools.specs(),
    });
    this.loadedThreads.add(thread.id);
    return thread.id as string;
  }

  async createConversation(): Promise<string> {
    const threadId = await this.startThread();
    const id = randomUUID();
    conversations.create(id, threadId);
    conversationThreads.add(id, threadId, this.toolsHash);
    this.threadToConversation.set(threadId, id);
    return id;
  }

  /**
   * Codex fixes a thread's tools when it starts. If the app's tools changed since this chat's
   * thread began, continue on a new thread that has them, seeded with a transcript of the chat.
   */
  private async activeThread(conversationId: string): Promise<string> {
    const threads = conversationThreads.list(conversationId);
    const last = threads[threads.length - 1];
    if (!last) throw new Error(`unknown conversation ${conversationId}`);
    if (last.tools_hash === this.toolsHash) {
      await this.ensureLoaded(last.thread_id, conversationId);
      return last.thread_id;
    }
    const transcript = await this.transcript(conversationId);
    const threadId = await this.startThread();
    conversationThreads.add(conversationId, threadId, this.toolsHash);
    this.threadToConversation.set(threadId, conversationId);
    if (transcript)
      await this.codex.request("thread/inject_items", {
        threadId,
        items: [{ type: "message", role: "user", content: [{ type: "input_text", text: `[Earlier in this chat, before an app update]\n${transcript}` }] }],
      });
    return threadId;
  }

  /** Compact text of the chat so far: messages, published tests and tool results. */
  private async transcript(conversationId: string) {
    const lines: string[] = [];
    for (const turn of await this.history(conversationId)) {
      for (const item of turn.items ?? []) {
        if (item.type === "userMessage")
          lines.push(`Learner: ${item.content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ")}`);
        else if (item.type === "agentMessage" && item.text) lines.push(`Tutor: ${item.text}`);
        else if (item.type === "dynamicToolCall" && item.success)
          lines.push(`[tool ${item.tool}] ${String(item.contentItems?.[0]?.text ?? "").slice(0, 300)}`);
      }
    }
    return lines.join("\n").slice(-12000);
  }

  /** Make sure a stored conversation's thread is loaded in this app-server process. */
  private async ensureLoaded(threadId: string, conversationId: string) {
    this.threadToConversation.set(threadId, conversationId);
    if (this.loadedThreads.has(threadId)) return;
    // Dynamic tools are stored with the thread, so resuming restores them.
    await this.codex.request("thread/resume", { threadId, excludeTurns: true });
    this.loadedThreads.add(threadId);
  }

  async send(conversationId: string, text: string, opts: { effort?: string } = {}) {
    const row = conversations.get(conversationId);
    if (!row) throw new Error(`unknown conversation ${conversationId}`);
    const threadId = await this.activeThread(conversationId);
    if (row.title === "New practice") {
      const m = text.match(/^<practice skill="(\w+)" mode="\w+"\/>\n/);
      const body = (m ? text.slice(m[0].length) : text).replace(/@\[([^\]]+)\]\(test:[0-9a-f-]{36}\)/g, "$1");
      conversations.update(conversationId, { title: body.slice(0, 60), skill: m?.[1] ?? null });
    }
    conversations.touch(conversationId);
    await this.codex.request("turn/start", {
      threadId,
      input: [{ type: "text", text, text_elements: [] }],
      // Test generation needs real reasoning; the model's own default (often "low") is too shallow.
      effort: opts.effort ?? process.env.IELTS_EFFORT ?? "medium",
      // Summaries of the tutor's reasoning feed the work log under each message.
      summary: "concise",
    });
  }

  async interrupt(conversationId: string) {
    const row = conversations.get(conversationId);
    if (!row) return;
    const turnId = this.activeTurns.get(row.thread_id);
    if (turnId) await this.codex.request("turn/interrupt", { threadId: row.thread_id, turnId });
  }

  /** Full history for re-rendering a conversation, across all of its threads. */
  async history(conversationId: string) {
    const turns: any[] = [];
    for (const { thread_id } of conversationThreads.list(conversationId)) {
      await this.ensureLoaded(thread_id, conversationId);
      let cursor: string | null = null;
      try {
        do {
          const page: any = await this.codex.request("thread/turns/list", { threadId: thread_id, cursor, limit: 50, sortDirection: "asc", itemsView: "full" });
          turns.push(...page.data);
          cursor = page.nextCursor;
        } while (cursor);
      } catch (err) {
        if (!String((err as Error).message).includes("not supported")) throw err;
      }
    }
    return turns;
  }

  answer(askId: string, answer: unknown) {
    const pending = this.pendingAsks.get(askId);
    if (!pending) return false;
    this.pendingAsks.delete(askId);
    pending.resolve(answer);
    return true;
  }

  private ask(conversationId: string, payload: Record<string, unknown>) {
    const askId = randomUUID();
    const event = { type: "ask", askId, ...payload };
    this.emit(conversationId, event);
    return new Promise<unknown>((resolve) => this.pendingAsks.set(askId, { conversationId, resolve, event }));
  }

  private conversationFor(threadId: string | undefined) {
    return threadId ? this.threadToConversation.get(threadId) : undefined;
  }

  private onNotification({ method, params }: Notification) {
    const conversationId = this.conversationFor(params?.threadId);
    if (!conversationId) return;
    const emit = (event: ClientEvent) => this.emit(conversationId, event);
    switch (method) {
      case "turn/started":
        this.activeTurns.set(params.threadId, params.turn.id);
        return emit({ type: "turn", status: "inProgress", turnId: params.turn.id, startedAt: Date.now() });
      case "turn/completed":
        this.activeTurns.delete(params.threadId);
        return emit({ type: "turn", status: params.turn.status, turnId: params.turn.id, error: params.turn.error ?? null });
      case "item/agentMessage/delta":
        return emit({ type: "delta", itemId: params.itemId, delta: params.delta });
      case "item/reasoning/summaryTextDelta":
        return emit({ type: "thinking", itemId: params.itemId, turnId: params.turnId, delta: params.delta });
      case "item/started":
      case "item/completed":
        return emit({ type: "item", phase: method === "item/started" ? "started" : "completed", item: params.item, turnId: params.turnId });
      case "error":
        return emit({ type: "error", message: params.error?.message ?? "Codex error", willRetry: params.willRetry });
    }
  }

  private async onServerRequest(req: ServerRequest): Promise<unknown> {
    const conversationId = this.conversationFor(req.params?.threadId);
    switch (req.method) {
      case "item/tool/call": {
        if (!conversationId) throw new Error("tool call for unknown thread");
        const { tool, arguments: args, threadId, turnId, callId } = req.params;
        return this.tools.call(tool, args, {
          conversationId,
          threadId,
          turnId,
          callId,
          emit: (event) => this.emit(conversationId, event as ClientEvent),
          ask: (payload) => this.ask(conversationId, payload),
        });
      }
      case "item/tool/requestUserInput": {
        // Codex's built-in question tool; render it with the same cards as ask_learner.
        if (!conversationId) throw new Error("user input for unknown thread");
        const questions = (req.params.questions ?? []).map((q: any) => ({
          id: q.id,
          header: q.header,
          question: q.question,
          options: (q.options ?? []).map((o: any) => ({ label: o.label, description: o.description })),
          multiSelect: false,
          allowOther: q.isOther,
        }));
        const answers = (await this.ask(conversationId, { kind: "questions", questions })) as Record<string, string[]>;
        return {
          answers: Object.fromEntries(Object.entries(answers).map(([id, values]) => [id, { answers: values }])),
        };
      }
      default:
        // Sandbox is read-only and approvals are "never", so approval requests are unexpected.
        throw new Error(`unsupported server request ${req.method}`);
    }
  }
}
