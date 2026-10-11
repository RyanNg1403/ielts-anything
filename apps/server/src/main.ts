import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { CodexAppServer } from "./codex/app-server.ts";
import { CODEX_HOME, ensureCodexHome } from "./codex/home.ts";
import { conversations } from "./db.ts";
import { Hub } from "./hub.ts";
import { askLearner, showBrief } from "./tools/learner.ts";
import { ToolRegistry } from "./tools/registry.ts";

const PORT = Number(process.env.PORT ?? 8787);
const SKILLS_DIR = fileURLToPath(new URL("../../../skills", import.meta.url));

const { loggedIn } = ensureCodexHome();
const codex = new CodexAppServer({
  codexHome: CODEX_HOME,
  log: (line) => {
    if (/ERROR|WARN/.test(line)) console.error(`[codex] ${line}`);
  },
});
await codex.start();
await codex.request("skills/extraRoots/set", { extraRoots: [SKILLS_DIR] });

const tools = new ToolRegistry([askLearner, showBrief]);
const hub = new Hub(codex, tools);

const app = new Hono();

app.get("/api/status", async (c) => {
  const account = await codex.request("account/read", { refreshToken: false }).catch(() => null);
  return c.json({ codexRunning: codex.running, loggedIn, account });
});

app.get("/api/conversations", (c) => c.json(conversations.list()));

app.post("/api/conversations", async (c) => c.json({ id: await hub.createConversation() }));

app.get("/api/conversations/:id/history", async (c) => c.json(await hub.history(c.req.param("id"))));

const server = serve({ fetch: app.fetch, port: PORT }, () => console.log(`server on http://localhost:${PORT}`));

// Browser <-> hub events. One socket per open conversation.
const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const conversationId = url.searchParams.get("conversation");
  if (url.pathname !== "/ws" || !conversationId || !conversations.get(conversationId)) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => attach(ws, conversationId));
});

function attach(ws: WebSocket, conversationId: string) {
  const send = (event: unknown) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(event));
  const unsubscribe = hub.subscribe(conversationId, send);
  ws.on("close", unsubscribe);
  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(String(raw));
      if (msg.type === "send") await hub.send(conversationId, msg.text, { effort: msg.effort });
      else if (msg.type === "answer") hub.answer(msg.askId, msg.answer);
      else if (msg.type === "interrupt") await hub.interrupt(conversationId);
    } catch (err) {
      send({ type: "error", message: (err as Error).message });
    }
  });
}

const shutdown = () => {
  codex.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
