// Connects browser sessions to Codex threads: starts threads, forwards turn events,
// and answers Codex's server requests (dynamic tool calls, user input).
import { randomUUID } from "node:crypto";
import { CodexAppServer, type Notification, type ServerRequest } from "./codex/app-server.ts";
import { createHash } from "node:crypto";
import { appEvents, conversationThreads, conversations } from "./db.ts";
import { DEVELOPER_INSTRUCTIONS, VOICE_PROMPT } from "./instructions.ts";
import type { ToolRegistry } from "./tools/registry.ts";
import { WORKSPACE } from "./codex/home.ts";
import { DEFAULT_EFFORT, DEFAULT_MODEL } from "./codex/defaults.ts";
import { keepGenerated } from "./writing/images.ts";

export type ClientEvent = Record<string, unknown> & { type: string };
type Listener = (event: ClientEvent) => void;
export type TurnOptions = { effort?: string; model?: string; fast?: boolean };
type PendingAsk = { conversationId: string; resolve: (answer: unknown) => void; event: ClientEvent };

export class Hub {
  private listeners = new Map<string, Set<Listener>>();
  private threadToConversation = new Map<string, string>();
  private pendingAsks = new Map<string, PendingAsk>();
  private loadedThreads = new Set<string>();
  private activeTurns = new Map<string, string>();
  private sdpWaiters = new Map<string, (sdp: string) => void>();
  private voiceThreads = new Map<string, string>();

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

  async send(conversationId: string, text: string, opts: TurnOptions = {}) {
    const row = conversations.get(conversationId);
    if (!row) throw new Error(`unknown conversation ${conversationId}`);
    const threadId = await this.activeThread(conversationId);
    if (row.title === "New practice") {
      const m = text.match(/^<practice skill="(\w+)" mode="\w+"\/>\n/);
      const raw = m ? text.slice(m[0].length) : text;
      // A chat that opens by mentioning a test is about that test.
      const mention = raw.match(/@\[([^\]]+)\]\(test:[0-9a-f-]{36}\)/);
      const body = mention ? mention[1]! : raw;
      conversations.update(conversationId, { title: body.slice(0, 60), skill: m?.[1] ?? null });
    }
    conversations.touch(conversationId);
    await this.codex.request("turn/start", {
      threadId,
      input: [{ type: "text", text, text_elements: [] }],
      // Test generation needs real reasoning; the model's own default (often "low") is too shallow.
      model: opts.model ?? DEFAULT_MODEL,
      effort: opts.effort ?? DEFAULT_EFFORT,
      serviceTierForTurn: opts.fast ? "priority" : "default",
      // Summaries of the tutor's reasoning feed the work log under each message.
      summary: "concise",
    });
  }

  async interrupt(conversationId: string) {
    for (const { thread_id } of conversationThreads.list(conversationId)) {
      const turnId = this.activeTurns.get(thread_id);
      if (turnId) await this.codex.request("turn/interrupt", { threadId: thread_id, turnId });
    }
  }

  /**
   * Start a spoken conversation on the chat's own thread (Codex realtime over WebRTC). The voice
   * hands real work (making or starting tests) to the tutor, whose turns stream into the chat.
   * Returns the SDP answer for the browser's peer connection.
   */
  async startVoice(conversationId: string, offerSdp: string) {
    const threadId = await this.activeThread(conversationId);
    const answer = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("The voice session did not start. Try again.")), 20000);
      this.sdpWaiters.set(threadId, (sdp) => (clearTimeout(timer), resolve(sdp)));
    });
    await this.codex.request("thread/realtime/start", {
      threadId,
      // On a ChatGPT login only WebRTC with realtime v3 and its own voices works.
      version: "v3",
      voice: process.env.IELTS_VOICE ?? "juniper",
      outputModality: "audio",
      transport: { type: "webrtc", sdp: offerSdp },
      prompt: VOICE_PROMPT,
    });
    this.voiceThreads.set(conversationId, threadId);
    return answer;
  }

  async stopVoice(conversationId: string) {
    const threadId = this.voiceThreads.get(conversationId);
    this.voiceThreads.delete(conversationId);
    if (threadId) await this.codex.request("thread/realtime/stop", { threadId }).catch(() => {});
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
        // Generated images are kept for writing_publish; the browser only needs to know one was made.
        if (params.item?.type === "imageGeneration") {
          if (method === "item/completed" && !params.item.failure) keepGenerated(conversationId, params.item);
          const { result: _image, ...item } = params.item;
          return emit({ type: "item", phase: method === "item/started" ? "started" : "completed", item, turnId: params.turnId });
        }
        return emit({ type: "item", phase: method === "item/started" ? "started" : "completed", item: params.item, turnId: params.turnId });
      case "error":
        return emit({ type: "error", message: params.error?.message ?? "Codex error", willRetry: params.willRetry });
      case "thread/realtime/sdp":
        this.sdpWaiters.get(params.threadId)?.(params.sdp);
        this.sdpWaiters.delete(params.threadId);
        return;
      case "thread/realtime/transcript/delta":
        return emit({ type: "voice", event: "delta", role: params.role, delta: params.delta });
      case "thread/realtime/transcript/done":
        // Realtime speech is not part of the thread's turns, so keep it for the chat history.
        if (params.text?.trim()) appEvents.add(conversationId, "voice", { role: params.role, text: params.text });
        return emit({ type: "voice", event: "done", role: params.role, text: params.text });
      case "thread/realtime/closed":
        this.voiceThreads.delete(conversationId);
        return emit({ type: "voice", event: "closed", reason: params.reason });
      case "thread/realtime/error":
        return emit({ type: "voice", event: "error", message: params.message });
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
