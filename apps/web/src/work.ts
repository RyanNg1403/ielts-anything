// Turns Codex thread items into plain-language steps for the work log under each message.

export type StepKind = "think" | "read" | "search" | "write" | "check" | "ask" | "done" | "other";
export type Step = { id: string; kind: StepKind; label: string; detail?: string; status: "running" | "done" | "failed" };

const SKILL_NAMES: Record<string, string> = {
  "ielts-core": "the IELTS format rules",
  "reading-passage-writer": "the passage-writing guide",
  "reading-item-writer": "the question-writing guide",
  "reading-key-auditor": "the answer-key checklist",
};

/** "**Planning passages**\n\nI'm going to..." -> label "Planning passages", detail "I'm going to..." */
export function splitSummary(text: string): { label: string; detail?: string } {
  const t = text.trim();
  const m = t.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
  if (m) return { label: m[1]!.trim(), detail: m[2]!.trim() || undefined };
  const first = t.split(/(?<=[.!?])\s/)[0] ?? t;
  return { label: first.length > 90 ? `${first.slice(0, 87)}…` : first, detail: t.length > first.length ? t : undefined };
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Map a thread item to a step, or null for items that are not shown in the log. */
export function stepFromItem(item: any, phase: "started" | "completed"): Step | null {
  const status = phase === "started" ? "running" : item.success === false || item.status === "failed" ? "failed" : "done";
  switch (item.type) {
    case "reasoning": {
      const text = (item.summary ?? []).join("\n\n");
      if (!text.trim()) return phase === "started" ? { id: item.id, kind: "think", label: "Thinking", status } : null;
      return { id: item.id, kind: "think", ...splitSummary(text), status };
    }
    case "commandExecution": {
      const actions: any[] = item.commandActions ?? [];
      const skill = actions.map((a) => String(a.path ?? a.command ?? "").match(/skills\/([\w-]+)\/SKILL\.md/)?.[1]).find(Boolean);
      if (skill) return { id: item.id, kind: "read", label: `Read ${SKILL_NAMES[skill] ?? skill}`, status };
      const read = actions.find((a) => a.type === "read");
      if (read) return { id: item.id, kind: "read", label: `Read ${read.name}`, status };
      return { id: item.id, kind: "other", label: "Looked something up", status };
    }
    case "webSearch": {
      const q = item.action?.query ?? item.query;
      if (item.action?.type === "openPage" && item.action.url) {
        let host = item.action.url;
        try {
          host = new URL(item.action.url).hostname.replace(/^www\./, "");
        } catch {}
        return { id: item.id, kind: "search", label: `Read ${host}`, status };
      }
      return { id: item.id, kind: "search", label: q ? `Searched “${q}”` : "Searched the web", status };
    }
    case "dynamicToolCall":
      return toolStep(item, status);
    case "contextCompaction":
      return { id: item.id, kind: "other", label: "Condensed the conversation so far", status };
  }
  return null;
}

function toolStep(item: any, status: Step["status"]): Step | null {
  const a = item.arguments ?? {};
  const out: string = item.contentItems?.[0]?.text ?? "";
  const id = item.id;
  const running = status === "running";
  switch (item.tool) {
    case "ask_learner":
      return { id, kind: "ask", label: running ? "Waiting for your answer" : `Asked you ${plural(a.questions?.length ?? 1, "question")}`, status };
    case "show_brief":
      return { id, kind: "write", label: "Planned the test", detail: a.title, status };
    case "reading_publish_passage": {
      const n = a.passageNumber ?? "";
      const title = a.passage?.title;
      if (running) return { id, kind: "write", label: `Checking passage ${n}`, detail: title, status };
      if (status === "failed") {
        const errors = out.split("\n").filter((l) => l.startsWith("- [error]")).length;
        return { id, kind: "check", label: `Passage ${n} needed ${plural(errors || 1, "fix")}`, detail: out.split("\n").slice(1, 4).join("\n"), status: "failed" };
      }
      return { id, kind: "write", label: `Wrote passage ${n}`, detail: title, status };
    }
    case "reading_finalize":
      if (running) return { id, kind: "check", label: "An independent solver is answering every question", status };
      if (status === "failed") {
        const m = out.match(/disagreed with (\d+)/);
        return { id, kind: "check", label: m ? `The solver disputed ${plural(Number(m[1]), "answer")}` : "Final checks found problems", detail: out.split("\n").slice(1, 5).join("\n"), status: "failed" };
      }
      return { id, kind: "done", label: "Every answer checked; test published", status };
    case "get_test_result":
      return { id, kind: "read", label: "Looked at your answers", status };
    case "list_tests":
      return { id, kind: "read", label: "Found your tests", status };
    case "explain_questions":
      return { id, kind: "write", label: `Explained ${plural(a.items?.length ?? 1, "question")}`, status };
    case "show_score":
      return { id, kind: "done", label: "Showed your score", status };
    case "show_test":
      return { id, kind: "done", label: "Brought up the test", status };
    case "start_test":
      return { id, kind: "done", label: "Opened the test", status };
  }
  return { id, kind: "other", label: item.tool, status };
}

export function formatElapsed(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}
