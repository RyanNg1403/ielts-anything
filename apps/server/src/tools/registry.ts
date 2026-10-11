// Dynamic tools: functions the app exposes to Codex via `thread/start.dynamicTools`.
// Codex calls them with `item/tool/call`; results go back as content items.
import { z } from "zod";

export type ToolContext = {
  conversationId: string;
  threadId: string;
  turnId: string;
  callId: string;
  /** Push an event to the browser(s) watching this conversation. */
  emit: (event: Record<string, unknown>) => void;
  /** Ask the learner something in the UI and wait for the answer. */
  ask: (payload: Record<string, unknown>) => Promise<unknown>;
};

export type ToolResult = { text: string; success?: boolean };

export type DynamicTool<S extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  input: S;
  run: (args: z.infer<S>, ctx: ToolContext) => Promise<ToolResult>;
};

export function defineTool<S extends z.ZodType>(tool: DynamicTool<S>): DynamicTool<S> {
  return tool;
}

export class ToolRegistry {
  private tools = new Map<string, DynamicTool>();

  constructor(tools: DynamicTool<any>[]) {
    for (const t of tools) this.tools.set(t.name, t);
  }

  /** Specs for `thread/start.dynamicTools`. */
  specs() {
    return [...this.tools.values()].map((t) => ({
      type: "function" as const,
      name: t.name,
      description: t.description,
      inputSchema: z.toJSONSchema(t.input, { target: "draft-7" }),
    }));
  }

  async call(name: string, rawArgs: unknown, ctx: ToolContext) {
    const tool = this.tools.get(name);
    if (!tool) return failure(`Unknown tool ${name}.`);
    const parsed = tool.input.safeParse(rawArgs);
    if (!parsed.success) {
      return failure(`Invalid arguments for ${name}:\n${z.prettifyError(parsed.error)}\nFix them and call ${name} again.`);
    }
    try {
      const result = await tool.run(parsed.data, ctx);
      return { contentItems: [{ type: "inputText", text: result.text }], success: result.success ?? true };
    } catch (err) {
      return failure(`${name} failed: ${(err as Error).message}`);
    }
  }
}

function failure(text: string) {
  return { contentItems: [{ type: "inputText", text }], success: false };
}
