// Independent solver: a fresh, tool-less Codex thread answers the test from the candidate
// view only. Disagreements with the key point at ambiguous or wrong items.
import {
  candidateText,
  listeningCandidateText,
  listeningPartQuestions,
  markListening,
  markReading,
  type ListeningTest,
  type ReadingResult,
  type ReadingTest,
} from "@ielts/spec";
import type { CodexAppServer } from "./app-server.ts";
import { WORKSPACE } from "./home.ts";
import { DEFAULT_EFFORT, DEFAULT_MODEL } from "./defaults.ts";

const READING_INSTRUCTIONS = `You are an expert IELTS candidate sitting an Academic Reading paper. Answer every question using only the passage text, following each instruction exactly (word limits, letters, TRUE/FALSE/NOT GIVEN or YES/NO/NOT GIVEN labels). Do not use outside knowledge. Do not run commands.`;

const LISTENING_INSTRUCTIONS = `You are an expert IELTS candidate sitting a Listening paper. You are given the transcript of each recording instead of the audio. Answer every question using only what the speakers say, following each instruction exactly (word limits, letters). Write completion answers with the words the speaker uses. For a map or plan, work out each place from the directions and the lettered positions. Do not use outside knowledge. Do not run commands.`;

export type SolverReport = {
  solverAnswers: Record<string, string>;
  disagreements: { q: number; key: string; solver: string; family: string }[];
};

type Opts = { effort?: string; timeoutMs?: number };

export function solveReading(codex: CodexAppServer, test: ReadingTest, opts: Opts = {}) {
  const questions = test.passages.flatMap((p) => p.blocks.flatMap((b) => (b.family === "mcq_multi" ? b.qs : b.items.map((i) => i.q))));
  return solve(codex, { instructions: READING_INSTRUCTIONS, paper: candidateText(test), questions, mark: (r) => markReading(test, r) }, opts);
}

export function solveListening(codex: CodexAppServer, test: ListeningTest, opts: Opts = {}) {
  const questions = test.parts.flatMap(listeningPartQuestions);
  return solve(codex, { instructions: LISTENING_INSTRUCTIONS, paper: listeningCandidateText(test), questions, mark: (r) => markListening(test, r) }, opts);
}

async function solve(
  codex: CodexAppServer,
  p: { instructions: string; paper: string; questions: number[]; mark: (responses: Record<number, string>) => ReadingResult },
  opts: Opts,
): Promise<SolverReport> {
  const outputSchema = {
    type: "object",
    additionalProperties: false,
    required: ["answers"],
    properties: {
      answers: {
        type: "object",
        additionalProperties: false,
        required: p.questions.map(String),
        properties: Object.fromEntries(p.questions.map((q) => [String(q), { type: "string" }])),
      },
    },
  };

  const { thread } = await codex.request("thread/start", {
    cwd: WORKSPACE,
    ephemeral: true,
    sandbox: "read-only",
    approvalPolicy: "never",
    developerInstructions: p.instructions,
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
    input: [{ type: "text", text: `${p.paper}\n\nAnswer all ${p.questions.length} questions.`, text_elements: [] }],
    outputSchema,
    model: DEFAULT_MODEL,
    effort: opts.effort ?? DEFAULT_EFFORT,
  });

  const raw = await done;
  const solverAnswers = (JSON.parse(raw).answers ?? {}) as Record<string, string>;
  const marked = p.mark(Object.fromEntries(Object.entries(solverAnswers).map(([q, a]) => [Number(q), a])));
  const disagreements = marked.items
    .filter((i) => !i.correct)
    .map((i) => ({ q: i.q, key: i.key.display, solver: i.given || "(blank)", family: i.key.family }));
  return { solverAnswers, disagreements };
}
