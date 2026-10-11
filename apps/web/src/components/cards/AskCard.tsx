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
      <div className="rounded-xl border border-rule bg-surface px-5 py-4">
        <p className="text-sm text-ink-soft">You chose</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
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
    <div className="rounded-xl border border-rule-strong bg-surface">
      <div className="space-y-6 px-5 py-5">
        {questions.map((q, qi) => (
          <fieldset key={q.id}>
            <legend className="font-serif text-[17px] font-semibold text-ink">
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
                    className={`rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                      on ? "border-primary bg-[#eef2f9] ring-1 ring-primary" : "border-rule hover:border-rule-strong"
                    }`}
                  >
                    <span className="block text-sm font-medium text-ink">{o.label}</span>
                    {o.description && <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{o.description}</span>}
                  </button>
                );
              })}
              {q.allowOther && (
                <label
                  className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 ${
                    picked[q.id]?.includes("__other") ? "border-primary ring-1 ring-primary" : "border-dashed border-rule-strong"
                  }`}
                >
                  <span className="text-sm text-ink-soft">Other</span>
                  <input
                    value={other[q.id] ?? ""}
                    onChange={(e) => {
                      setOther((o) => ({ ...o, [q.id]: e.target.value }));
                      setPicked((p) => {
                        const cur = (p[q.id] ?? []).filter((x) => x !== "__other");
                        if (!e.target.value) return { ...p, [q.id]: cur };
                        return { ...p, [q.id]: q.multiSelect ? [...cur, "__other"] : ["__other"] };
                      });
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                    placeholder="Type your own"
                  />
                </label>
              )}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="flex justify-end border-t border-rule px-5 py-3">
        <button
          disabled={!complete}
          onClick={() => onSubmit?.(final)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
