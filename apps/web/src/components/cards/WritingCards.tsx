import { TASK2_NAMES, task1Label, writingMinutes, writingTasks, type WritingResult } from "@ielts/spec";
import { isMarking, type WritingPayload } from "../../data.ts";
import { go } from "../../router.ts";
import { WritingBands } from "../../test/WritingResults.tsx";

const open = (id: string) => go({ name: "test", id, review: false, q: null, part: null });

export function WritingTestCard({ data, className }: { data: WritingPayload; className: string }) {
  const t = data.test;
  const tasks = writingTasks(t);
  const result = data.attempt && !isMarking(data.attempt) ? (data.attempt.result as WritingResult) : null;
  const label = (n: 1 | 2) => (n === 1 ? `Report: ${task1Label(t.task1!)}` : `Essay: ${TASK2_NAMES[t.task2!.family].toLowerCase()}`);
  return (
    <button onClick={() => open(data.id)} className={className}>
      <div className="flex items-start gap-4 px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[22px] font-medium leading-snug text-ink">{t.title}</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Writing · {tasks.length === 2 ? "Tasks 1 and 2" : `Task ${tasks[0]} ${label(tasks[0]!).toLowerCase()}`} · {writingMinutes(t)} min
          </p>
        </div>
        {isMarking(data.attempt) ? (
          <span className="mt-1 text-sm text-ink-soft">Marking…</span>
        ) : result ? (
          <span className="font-serif text-[26px] font-semibold leading-none tabular-nums text-ink">{result.band != null ? result.band.toFixed(1) : "–"}</span>
        ) : (
          <svg aria-hidden viewBox="0 0 16 16" className="mt-2 size-4 shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 3.5 10.5 8 6 12.5" />
          </svg>
        )}
      </div>
      {tasks.length > 1 && (
        <ol className="border-t border-rule px-5 py-3">
          {tasks.map((n) => (
            <li key={n} className="flex items-baseline gap-3 py-1 text-[15px]">
              <span className="w-4 shrink-0 text-ink-faint">{n}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{label(n)}</span>
            </li>
          ))}
        </ol>
      )}
    </button>
  );
}

export function WritingScoreCard({ data, className }: { data: WritingPayload; className: string }) {
  if (!data.attempt) return null;
  const result = data.attempt.result as WritingResult;
  return (
    <button onClick={() => open(data.id)} className={`${className} px-5 py-5`}>
      <p className="mb-4 font-serif text-[18px] font-medium text-ink">{data.test.title}</p>
      {isMarking(data.attempt) ? (
        <p className="text-[15px] text-ink-soft">Marking your writing…</p>
      ) : result.band != null ? (
        <WritingBands result={result} compact />
      ) : (
        <p className="text-[15px] text-ink-soft">{result.unmarked}</p>
      )}
    </button>
  );
}
