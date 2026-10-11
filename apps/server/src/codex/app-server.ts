// JSON-RPC client for `codex app-server` over stdio.
// Protocol reference: `codex app-server generate-ts --experimental --out <dir>`.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";

export type Notification = { method: string; params: any };
export type ServerRequest = { id: number | string; method: string; params: any };
export type ServerRequestHandler = (req: ServerRequest) => Promise<unknown>;

type Pending = { resolve: (v: any) => void; reject: (e: Error) => void; method: string };

export class RpcError extends Error {
  constructor(method: string, readonly error: unknown) {
    super(`${method}: ${JSON.stringify(error)}`);
  }
}

export class CodexAppServer extends EventEmitter<{ notification: [Notification]; exit: [number | null] }> {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private serverRequestHandler: ServerRequestHandler = async (req) => {
    throw new Error(`unhandled server request ${req.method}`);
  };

  constructor(private readonly opts: { codexHome: string; bin?: string; log?: (line: string) => void }) {
    super();
  }

  onServerRequest(handler: ServerRequestHandler) {
    this.serverRequestHandler = handler;
  }

  async start() {
    const proc = spawn(this.opts.bin ?? "codex", ["app-server"], {
      env: { ...process.env, CODEX_HOME: this.opts.codexHome },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc = proc;
    proc.on("exit", (code) => {
      for (const p of this.pending.values()) p.reject(new Error(`codex app-server exited (${code}) during ${p.method}`));
      this.pending.clear();
      this.proc = null;
      this.emit("exit", code);
    });
    createInterface({ input: proc.stderr }).on("line", (line) => this.opts.log?.(line));
    createInterface({ input: proc.stdout }).on("line", (line) => this.onLine(line));

    await this.request("initialize", {
      clientInfo: { name: "ielts-anything", title: "IELTS Anything", version: "0.1.0" },
      capabilities: { experimentalApi: true, requestAttestation: false },
    });
    this.write({ jsonrpc: "2.0", method: "initialized" });
  }

  stop() {
    this.proc?.kill();
  }

  get running() {
    return this.proc !== null;
  }

  request<T = any>(method: string, params: unknown): Promise<T> {
    if (!this.proc) return Promise.reject(new Error("codex app-server is not running"));
    const id = this.nextId++;
    this.write({ jsonrpc: "2.0", id, method, params });
    return new Promise<T>((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }

  private write(msg: unknown) {
    this.proc?.stdin.write(JSON.stringify(msg) + "\n");
  }

  private onLine(line: string) {
    let msg: any;
    try {
      msg = JSON.parse(line);
    } catch {
      this.opts.log?.(`non-JSON stdout: ${line}`);
      return;
    }
    // Response to one of our requests.
    if (msg.id !== undefined && msg.method === undefined) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new RpcError(p.method, msg.error));
      else p.resolve(msg.result);
      return;
    }
    // Request from the server (tool calls, approvals, user input).
    if (msg.id !== undefined && msg.method) {
      this.serverRequestHandler(msg)
        .then((result) => this.write({ jsonrpc: "2.0", id: msg.id, result }))
        .catch((err: Error) =>
          this.write({ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: err.message } }),
        );
      return;
    }
    if (msg.method) this.emit("notification", { method: msg.method, params: msg.params });
  }
}
