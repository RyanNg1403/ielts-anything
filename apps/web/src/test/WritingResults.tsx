// Writing results: bands, the marker's evidence per criterion, corrections, and the learner's own
// writing with the corrected passages marked.
import { useState, type ReactNode } from "react";
import { WRITING_CRITERIA, WRITING_CRITERION_NAMES, WRITING_MIN_WORDS, writingTasks, type WritingResult, type WritingTaskNumber, type WritingTaskResult } from "@ielts/spec";
import { retakeWriting, type WritingPayload } from "../data.ts";
import { exitTest } from "../router.ts";
import { TaskPaper } from "./WritingScreen.tsx";

export function WritingResults({ data, result }: { data: WritingPayload; result: WritingResult }) {
  const [error, setError] = useState<string | null>(null);
  const tasks = writingTasks(data.test).filter((n) => result.tasks[`${n}`]);
  const retake = () => data.attempt && retakeWriting(data.id, data.attempt.id).catch((err) => setError(err.message));
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <header className="flex h-14 items-center border-b border-rule bg-surface px-4">
        <button
          onClick={() => exitTest(data.conversationId ? { name: "chat", id: data.conversationId } : { name: "tests" })}
          className="rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-paper hover:text-ink"
        >
          Back
        </button>
      </header>
      <main className="mx-auto max-w-[720px] px-6 py-12">
        <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink">{data.test.title}</h1>
        <div className="mt-8 rounded-2xl border border-rule bg-surface p-6 shadow-[var(--shadow-card)]">
          {result.band != null ? (
            <WritingBands result={result} />
          ) : (
            <>
              <p className="font-serif text-[22px] text-ink">Not marked</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{result.unmarked}</p>
              <button onClick={retake} className="mt-5 h-10 rounded-xl bg-primary px-4 text-[14px] font-medium text-on-primary hover:bg-primary-hover">
                Take the test again
              </button>
              {error && (
                <p role="alert" className="mt-3 text-[14px] text-danger">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
        {tasks.map((n) => (
          <TaskSection key={n} n={n} data={data} r={result.tasks[`${n}`]!} />
        ))}
      </main>
    </div>
  );
}

/** Overall band, then each task's band and its four criteria. Shared with the chat score card. */
export function WritingBands({ result, compact }: { result: WritingResult; compact?: boolean }) {
  const tasks = (["1", "2"] as const).filter((n) => result.tasks[n]);
  return (
    <div>
      <p>
        <span className={`block font-serif font-semibold leading-none text-ink ${compact ? "text-[44px]" : "text-[64px]"}`}>{result.band?.toFixed(1)}</span>
        <span className="mt-1 block text-sm text-ink-soft">Estimated band{tasks.length === 2 ? " (Task 2 counts twice as much as Task 1)" : ""}</span>
      </p>
      {tasks.map((n) => {
        const r = result.tasks[n]!;
        return (
          <div key={n} className="mt-6">
            {tasks.length > 1 && (
              <p className="mb-2 flex justify-between text-[14px] font-semibold text-ink">
                <span>Task {n}</span>
                <span className="tabular-nums">{r.band.toFixed(1)}</span>
              </p>
            )}
            <div className="space-y-2">
              {WRITING_CRITERIA.map((c) => (
                <div key={c} className="grid grid-cols-[minmax(0,15rem)_1fr_2rem] items-center gap-3 text-[14px]">
                  <span className="truncate text-ink">{WRITING_CRITERION_NAMES[Number(n) as WritingTaskNumber][c]}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-paper">
                    <span className="block h-full rounded-full bg-ink-soft" style={{ width: `${(r[c].band / 9) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-ink">{r[c].band}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskSection({ n, data, r }: { n: WritingTaskNumber; data: WritingPayload; r: WritingTaskResult }) {
  const text = data.attempt?.responses[`${n}`] ?? "";
  return (
    <section className="mt-14">
      <h2 className="flex items-baseline justify-between gap-4 font-serif text-[24px] font-semibold text-ink">
        <span>Task {n}</span>
        <span className="tabular-nums">{r.band.toFixed(1)}</span>
      </h2>
      <p className="mt-1 text-[14px] text-ink-soft">
        {r.words} words{r.words < WRITING_MIN_WORDS[n] ? `, under the ${WRITING_MIN_WORDS[n]} asked` : ""}
      </p>
      <details className="mt-4 rounded-xl border border-rule bg-surface">
        <summary className="cursor-pointer px-5 py-3 text-[14px] text-ink-soft hover:text-ink">Show the task</summary>
        <TaskPaper test={data.test} n={n} />
      </details>

      {WRITING_CRITERIA.map((c) => (
        <div key={c} className="mt-8">
          <h3 className="flex items-baseline justify-between gap-4 font-serif text-[19px] text-ink">
            <span>{WRITING_CRITERION_NAMES[n][c]}</span>
            <span className="tabular-nums">{r[c].band}</span>
          </h3>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink">{r[c].evidence}</p>
          {r[c].descriptor && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{r[c].descriptor}</p>}
        </div>
      ))}

      {r.corrections.length > 0 && (
        <div className="mt-10">
          <h3 className="font-serif text-[19px] text-ink">Corrections</h3>
          <ol className="mt-3 space-y-3">
            {r.corrections.map((x, i) => (
              <li key={i} className="rounded-xl border border-rule bg-surface px-4 py-3 text-[15px]">
                <p>
                  <s className="text-danger">{x.quote}</s>
                  <span className="mx-2 text-ink-faint" aria-hidden>
                    →
                  </span>
                  <span className="text-ink">{x.fix}</span>
                </p>
                <p className="mt-1 text-[14px] text-ink-soft">{x.why}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {r.nextSteps && (
        <div className="mt-10">
          <h3 className="font-serif text-[19px] text-ink">What to practise next</h3>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink">{r.nextSteps}</p>
        </div>
      )}

      {text.trim() && (
        <div className="mt-10">
          <h3 className="font-serif text-[19px] text-ink">Your writing</h3>
          <div className="mt-3 rounded-xl border border-rule bg-surface px-5 py-4 font-serif text-[16px] leading-[1.75] whitespace-pre-wrap text-ink">
            {markQuotes(text, r.corrections.map((x) => x.quote))}
          </div>
          {r.corrections.length > 0 && <p className="mt-2 text-[13px] text-ink-soft">Underlined: passages with a correction above.</p>}
        </div>
      )}
    </section>
  );
}

/** The learner's text with each corrected passage underlined (first occurrence of each quote). */
function markQuotes(text: string, quotes: string[]) {
  const spans: [number, number][] = [];
  for (const q of quotes) {
    const at = q.trim() ? text.indexOf(q.trim()) : -1;
    if (at !== -1 && !spans.some(([a, b]) => at < b && at + q.trim().length > a)) spans.push([at, at + q.trim().length]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let pos = 0;
  spans.forEach(([a, b], i) => {
    out.push(text.slice(pos, a));
    out.push(
      <mark key={i} className="bg-transparent text-ink underline decoration-danger decoration-2 underline-offset-4">
        {text.slice(a, b)}
      </mark>,
    );
    pos = b;
  });
  out.push(text.slice(pos));
  return out;
}
