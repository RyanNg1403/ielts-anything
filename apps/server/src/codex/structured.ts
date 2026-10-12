// One-off Codex runs that must answer in a fixed JSON shape (markers, checkers).
import { z } from "zod";
import type { CodexAppServer } from "./app-server.ts";
import { WORKSPACE } from "./home.ts";
import { DEFAULT_EFFORT, DEFAULT_MODEL } from "./defaults.ts";

/** A zod schema as a strict JSON Schema: every property required, no extra keys, no numeric/length keywords. */
export function strictSchema(schema: z.ZodType): Record<string, unknown> {
  const strip = (node: any): any => {
    if (Array.isArray(node)) return node.map(strip);
    if (!node || typeof node !== "object") return node;
    const out: any = {};
    for (const [k, v] of Object.entries(node)) {
      if (["$schema", "minimum", "maximum", "minItems", "maxItems", "minLength", "maxLength", "exclusiveMinimum", "exclusiveMaximum", "default"].includes(k)) continue;
      out[k] = strip(v);
    }
    if (out.type === "object" && out.properties) {
      out.required = Object.keys(out.properties);
      out.additionalProperties = false;
    }
    return out;
  };
  return strip(z.toJSONSchema(schema, { target: "draft-7" }));
}

/** Run a single turn on a fresh, tool-less, ephemeral thread and parse its JSON answer. */
export async function runStructured<T>(
  codex: CodexAppServer,
  opts: { instructions: string; prompt: string; schema: z.ZodType<T>; effort?: string; timeoutMs?: number },
): Promise<T> {
  const { thread } = await codex.request("thread/start", {
    cwd: WORKSPACE,
    ephemeral: true,
    sandbox: "read-only",
    approvalPolicy: "never",
    developerInstructions: opts.instructions,
  });

  const done = new Promise<string>((resolve, reject) => {
    let finalText = "";
    const timer = setTimeout(() => {
      codex.off("notification", onNote);
      reject(new Error("timed out"));
    }, opts.timeoutMs ?? 10 * 60_000);
    function onNote({ method, params }: { method: string; params: any }) {
      if (params?.threadId !== thread.id) return;
      if (method === "item/completed" && params.item.type === "agentMessage") finalText = params.item.text;
      if (method === "turn/completed") {
        clearTimeout(timer);
        codex.off("notification", onNote);
        if (params.turn.status === "completed") resolve(finalText);
        else reject(new Error(`turn ${params.turn.status}`));
      }
    }
    codex.on("notification", onNote);
  });

  await codex.request("turn/start", {
    threadId: thread.id,
    input: [{ type: "text", text: opts.prompt, text_elements: [] }],
    outputSchema: strictSchema(opts.schema),
    model: DEFAULT_MODEL,
    effort: opts.effort ?? DEFAULT_EFFORT,
  });
  return opts.schema.parse(JSON.parse(await done));
}
