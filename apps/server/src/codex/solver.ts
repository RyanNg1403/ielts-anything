// Independent solver: a fresh, tool-less Codex thread answers the test from the candidate
// view only. Disagreements with the key point at ambiguous or wrong items.
import { candidateText, markReading, type ReadingTest } from "@ielts/spec";
import type { CodexAppServer } from "./app-server.ts";
import { WORKSPACE } from "./home.ts";

const SOLVER_INSTRUCTIONS = `You are an expert IELTS candidate sitting an Academic Reading paper. Answer every question using only the passage text, following each instruction exactly (word limits, letters, TRUE/FALSE/NOT GIVEN or YES/NO/NOT GIVEN labels). Do not use outside knowledge. Do not run commands.`;

export type SolverReport = {
  solverAnswers: Record<string, string>;
  disagreements: { q: number; key: string; solver: string; family: string }[];
};

export async function solveReading(codex: CodexAppServer, test: ReadingTest, opts: { effort?: string; timeoutMs?: number } = {}): Promise<SolverReport> {
  const questions = test.passages.flatMap((p) => p.blocks.flatMap((b) => (b.family === "mcq_multi" ? b.qs : b.items.map((i) => i.q))));
  const outputSchema = {
    type: "object",
    additionalProperties: false,
    required: ["answers"],
    properties: {
      answers: {
        type: "object",
        additionalProperties: false,
        required: questions.map(String),
        properties: Object.fromEntries(questions.map((q) => [String(q), { type: "string" }])),
      },
    },
  };

  const { thread } = await codex.request("thread/start", {
    cwd: WORKSPACE,
    ephemeral: true,
    sandbox: "read-only",
    approvalPolicy: "never",
    developerInstructions: SOLVER_INSTRUCTIONS,
  });

  const done = new Promise<string>((resolve, reject) => {
    let finalText = "";
    const timer = setTimeout(() => {
      codex.off("notification", onNote);
      reject(new Error("solver timed out"));
    }, opts.timeoutMs ?? 10 * 60_000);
    function onNote({ method, params }: { method: string; params: any }) {
      if (params?.threadId !== thread.id) return;
      if (method === "item/completed" && params.item.type === "agentMessage") finalText = params.item.text;
      if (method === "turn/completed") {
        clearTimeout(timer);
        codex.off("notification", onNote);
        if (params.turn.status === "completed") resolve(finalText);
        else reject(new Error(`solver turn ${params.turn.status}`));
      }
    }
    codex.on("notification", onNote);
  });

  await codex.request("turn/start", {
    threadId: thread.id,
    input: [{ type: "text", text: `${candidateText(test)}\n\nAnswer all ${questions.length} questions.`, text_elements: [] }],
    outputSchema,
    effort: opts.effort ?? "medium",
  });

  const raw = await done;
  const solverAnswers = (JSON.parse(raw).answers ?? {}) as Record<string, string>;
  const marked = markReading(
    test,
    Object.fromEntries(Object.entries(solverAnswers).map(([q, a]) => [Number(q), a])),
  );
  const disagreements = marked.items
    .filter((i) => !i.correct)
    .map((i) => ({ q: i.q, key: i.key.display, solver: i.given || "(blank)", family: i.key.family }));
  return { solverAnswers, disagreements };
}
