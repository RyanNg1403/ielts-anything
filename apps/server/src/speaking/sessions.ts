// Live Speaking tests: one Codex realtime voice session (WebRTC, v3) per sitting, on its own
// ephemeral thread so the examiner has no tools and nothing to hand off. Transcripts stream to the
// test room over server-sent events.
import { randomUUID } from "node:crypto";
import type { SpeakingTest } from "@ielts/spec";
import type { CodexAppServer, Notification } from "../codex/app-server.ts";
import { WORKSPACE } from "../codex/home.ts";
import { examinerPrompt } from "./examiner.ts";

export type SessionEvent =
  | { type: "delta"; role: "examiner" | "candidate"; delta: string }
  | { type: "done"; role: "examiner" | "candidate"; text: string }
  | { type: "closed"; reason: string | null }
  | { type: "error"; message: string };

type Session = { id: string; testId: string; threadId: string; listeners: Set<(e: SessionEvent) => void>; backlog: SessionEvent[] };

export class SpeakingSessions {
  private byId = new Map<string, Session>();
  private byThread = new Map<string, Session>();
  private sdpWaiters = new Map<string, (sdp: string) => void>();

  constructor(private readonly codex: CodexAppServer) {
    codex.on("notification", (n) => this.onNotification(n));
  }

  /** Start the examiner for a test; returns the session id and the SDP answer for the browser. */
  async start(testId: string, test: SpeakingTest, offerSdp: string) {
    const { thread } = await this.codex.request("thread/start", {
      cwd: WORKSPACE,
      ephemeral: true,
      sandbox: "read-only",
      approvalPolicy: "never",
    });
    const session: Session = { id: randomUUID(), testId, threadId: thread.id, listeners: new Set(), backlog: [] };
    this.byId.set(session.id, session);
    this.byThread.set(thread.id, session);

    const answer = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("The examiner did not connect. Try again.")), 20000);
      this.sdpWaiters.set(thread.id, (sdp) => (clearTimeout(timer), resolve(sdp)));
    });
    try {
      await this.codex.request("thread/realtime/start", {
        threadId: thread.id,
        // On a ChatGPT login only WebRTC with realtime v3 and its own voices works.
        version: "v3",
        voice: process.env.IELTS_EXAMINER_VOICE ?? "spruce",
        outputModality: "audio",
        transport: { type: "webrtc", sdp: offerSdp },
        includeStartupContext: false,
        // The examiner never hands work to Codex.
        clientManagedHandoffs: true,
        prompt: examinerPrompt(test),
      });
      return { sessionId: session.id, sdp: await answer };
    } catch (err) {
      this.forget(session);
      throw err;
    }
  }

  subscribe(sessionId: string, listener: (e: SessionEvent) => void) {
    const s = this.byId.get(sessionId);
    if (!s) return null;
    for (const e of s.backlog) listener(e);
    s.listeners.add(listener);
    return () => s.listeners.delete(listener);
  }

  async stop(sessionId: string) {
    const s = this.byId.get(sessionId);
    if (!s) return;
    this.forget(s);
    await this.codex.request("thread/realtime/stop", { threadId: s.threadId }).catch(() => {});
  }

  private forget(s: Session) {
    this.byId.delete(s.id);
    this.byThread.delete(s.threadId);
    this.sdpWaiters.delete(s.threadId);
  }

  private onNotification({ method, params }: Notification) {
    if (!method.startsWith("thread/realtime/")) return;
    if (method === "thread/realtime/sdp") {
      this.sdpWaiters.get(params.threadId)?.(params.sdp);
      this.sdpWaiters.delete(params.threadId);
      return;
    }
    const s = this.byThread.get(params?.threadId);
    if (!s) return;
    const role = params.role === "user" ? "candidate" : "examiner";
    let event: SessionEvent | null = null;
    if (method === "thread/realtime/transcript/delta") event = { type: "delta", role, delta: params.delta };
    else if (method === "thread/realtime/transcript/done") event = { type: "done", role, text: params.text };
    else if (method === "thread/realtime/closed") event = { type: "closed", reason: params.reason ?? null };
    else if (method === "thread/realtime/error") event = { type: "error", message: params.message };
    if (!event) return;
    if (event.type !== "delta") s.backlog.push(event);
    for (const l of s.listeners) l(event);
    if (event.type === "closed") this.forget(s);
  }
}
