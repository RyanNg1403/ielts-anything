import { useState } from "react";
import type { Question } from "../../api.ts";

/** Clarifying questions from Codex (ask_learner). One question at a time, like a short form. */
export function AskCard({
  questions,
  answers,
  onSubmit,
}: {
  questions: Question[];
  answers: Record<string, string[]> | null;
  onSubmit?: (answers: Record<string, string[]>) => void;
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const done = answers !== null;

  if (done) {
    return (
      <div className="rounded-2xl border border-rule bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          {questions.map((q) => (
            <div key={q.id} className="contents">
              <dt className="text-ink-soft">{q.header}</dt>
              <dd className="font-medium text-ink">{(answers[q.id] ?? ["Skipped"]).join(", ")}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  const toggle = (q: Question, label: string) =>
    setPicked((p) => {
      const cur = p[q.id] ?? [];
      if (!q.multiSelect) return { ...p, [q.id]: [label] };
      return { ...p, [q.id]: cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label] };
    });

  const final = Object.fromEntries(
    questions.map((q) => {
      const typed = other[q.id]?.trim();
      const chosen = (picked[q.id] ?? []).filter((x) => x !== "__other");
      return [q.id, typed && picked[q.id]?.includes("__other") ? [...chosen, typed] : chosen];
    }),
  );
  const complete = questions.every((q) => (final[q.id] ?? []).length > 0);

  return (
    <div className="rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)]">
      <div className="space-y-6 px-5 py-5">
        {questions.map((q, qi) => (
          <fieldset key={q.id}>
            <legend className="font-serif text-[19px] font-medium text-ink">
              {questions.length > 1 && <span className="mr-2 text-ink-faint">{qi + 1}.</span>}
              {q.question}
            </legend>
            {q.multiSelect && <p className="mt-0.5 text-sm text-ink-soft">Choose all that apply.</p>}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map((o) => {
                const on = picked[q.id]?.includes(o.label) ?? false;
                return (
                  <button
                    key={o.label}
                    onClick={() => toggle(q, o.label)}
                    aria-pressed={on}
                    className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                      on ? "border-ink bg-selected" : "border-rule hover:border-rule-strong hover:bg-paper"
                    }`}
                  >
                    <span className="block text-sm font-medium text-ink">{o.label}</span>
                    {o.description && <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{o.description}</span>}
                  </button>
                );
              })}
            </div>
            {q.allowOther && (
              <input
                value={other[q.id] ?? ""}
                aria-label={`Your own answer to: ${q.question}`}
                onChange={(e) => {
                  const v = e.target.value;
                  setOther((o) => ({ ...o, [q.id]: v }));
                  setPicked((p) => {
                    const cur = (p[q.id] ?? []).filter((x) => x !== "__other");
                    if (!v.trim()) return { ...p, [q.id]: cur };
                    return { ...p, [q.id]: q.multiSelect ? [...cur, "__other"] : ["__other"] };
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && complete) onSubmit?.(final);
                }}
                placeholder="Or type your own"
                className={`mt-2 h-11 w-full rounded-xl border bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none ${
                  picked[q.id]?.includes("__other") ? "border-ink" : "border-rule"
                }`}
              />
            )}
          </fieldset>
        ))}
      </div>
      <div className="flex justify-end px-5 pb-5">
        <button
          disabled={!complete}
          onClick={() => onSubmit?.(final)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
