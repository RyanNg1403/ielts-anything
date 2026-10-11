// Connects browser sessions to Codex threads: starts threads, forwards turn events,
// and answers Codex's server requests (dynamic tool calls, user input).
import { randomUUID } from "node:crypto";
import { CodexAppServer, type Notification, type ServerRequest } from "./codex/app-server.ts";
import { conversations } from "./db.ts";
import { DEVELOPER_INSTRUCTIONS } from "./instructions.ts";
import type { ToolRegistry } from "./tools/registry.ts";
import { WORKSPACE } from "./codex/home.ts";

export type ClientEvent = Record<string, unknown> & { type: string };
type Listener = (event: ClientEvent) => void;
type PendingAsk = { conversationId: string; resolve: (answer: unknown) => void };

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
    return () => set.delete(listener);
  }

  private emit(conversationId: string, event: ClientEvent) {
    for (const l of this.listeners.get(conversationId) ?? []) l(event);
  }

  async createConversation(): Promise<string> {
    const { thread } = await this.codex.request("thread/start", {
      cwd: WORKSPACE,
      sandbox: "read-only",
      approvalPolicy: "never",
      developerInstructions: DEVELOPER_INSTRUCTIONS,
      dynamicTools: this.tools.specs(),
    });
    const id = randomUUID();
    conversations.create(id, thread.id);
    this.threadToConversation.set(thread.id, id);
    this.loadedThreads.add(thread.id);
    return id;
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
    await this.ensureLoaded(row.thread_id, conversationId);
    if (row.title === "New practice") {
      const m = text.match(/^<practice skill="(\w+)" mode="\w+"\/>\n/);
      const body = m ? text.slice(m[0].length) : text;
      conversations.update(conversationId, { title: body.slice(0, 60), skill: m?.[1] ?? null });
    }
    conversations.touch(conversationId);
    await this.codex.request("turn/start", {
      threadId: row.thread_id,
      input: [{ type: "text", text, text_elements: [] }],
      ...(opts.effort ? { effort: opts.effort } : {}),
    });
  }

  async interrupt(conversationId: string) {
    const row = conversations.get(conversationId);
    if (!row) return;
    const turnId = this.activeTurns.get(row.thread_id);
    if (turnId) await this.codex.request("turn/interrupt", { threadId: row.thread_id, turnId });
  }

  /** Full history for re-rendering a conversation. A thread with no turns yet has none to list. */
  async history(conversationId: string) {
    const row = conversations.get(conversationId);
    if (!row) throw new Error(`unknown conversation ${conversationId}`);
    await this.ensureLoaded(row.thread_id, conversationId);
    const turns: any[] = [];
    let cursor: string | null = null;
    try {
      do {
        const page: any = await this.codex.request("thread/turns/list", {
          threadId: row.thread_id,
          cursor,
          limit: 50,
          sortDirection: "asc",
          itemsView: "full",
        });
        turns.push(...page.data);
        cursor = page.nextCursor;
      } while (cursor);
    } catch (err) {
      if (!String((err as Error).message).includes("not supported")) throw err;
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
    this.emit(conversationId, { type: "ask", askId, ...payload });
    return new Promise<unknown>((resolve) => this.pendingAsks.set(askId, { conversationId, resolve }));
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
        return emit({ type: "turn", status: "inProgress", turnId: params.turn.id });
      case "turn/completed":
        this.activeTurns.delete(params.threadId);
        return emit({ type: "turn", status: params.turn.status, turnId: params.turn.id, error: params.turn.error ?? null });
      case "item/agentMessage/delta":
        return emit({ type: "delta", itemId: params.itemId, delta: params.delta });
      case "item/reasoning/summaryTextDelta":
        return emit({ type: "thinking", itemId: params.itemId, delta: params.delta });
      case "item/started":
      case "item/completed":
        return emit({ type: "item", phase: method === "item/started" ? "started" : "completed", item: params.item });
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
