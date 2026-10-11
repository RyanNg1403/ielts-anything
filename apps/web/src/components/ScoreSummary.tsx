import type { ReadingResult, ReadingTest } from "@ielts/spec";
import { breakdown, formatDuration, pct } from "../analytics.ts";

/** Band, raw score, parts and question types. Shared by the results screen and the chat score card. */
export function ScoreSummary({ test, result, elapsedSec, compact, onPick }: { test: ReadingTest; result: ReadingResult; elapsedSec: number | null; compact?: boolean; onPick?: (q: number) => void }) {
  const b = breakdown(test, result);
  const time = formatDuration(elapsedSec);
  return (
    <div>
      <div className="flex items-end gap-6">
        {result.band != null ? (
          <p>
            <span className={`block font-serif font-semibold leading-none text-ink ${compact ? "text-[44px]" : "text-[64px]"}`}>{result.band.toFixed(1)}</span>
            <span className="mt-1 block text-sm text-ink-soft">Estimated band</span>
          </p>
        ) : null}
        <p>
          <span className={`block font-serif font-semibold leading-none text-ink ${compact ? (result.band != null ? "text-[26px]" : "text-[44px]") : "text-[36px]"}`}>
            {result.raw}
            <span className="text-ink-faint">/{result.total}</span>
          </span>
          <span className="mt-1 block text-sm text-ink-soft">Correct{time ? ` in ${time}` : ""}</span>
        </p>
      </div>

      {onPick && (
        <div className="mt-6 flex flex-wrap gap-1.5" aria-label="Questions">
          {result.items.map((i) => (
            <button
              key={i.q}
              onClick={() => onPick(i.q)}
              title={i.correct ? `Question ${i.q}: correct` : `Question ${i.q}: ${i.given ? `you wrote ${i.given}` : "no answer"}`}
              className={`size-8 rounded-full text-[13px] font-semibold ${i.correct ? "bg-correct-wash text-reading" : "bg-wrong-fill text-danger"} hover:ring-2 hover:ring-rule-strong`}
            >
              {i.q}
            </button>
          ))}
        </div>
      )}

      {b.parts.length > 1 && (
        <div className="mt-6 space-y-2">
          {b.parts.map((p, i) => (
            <Bar key={i} label={`Passage ${i + 1}`} hint={p.title} correct={p.correct} total={p.total} />
          ))}
        </div>
      )}

      <div className="mt-6 space-y-2">
        {b.families.map((f) => (
          <Bar key={f.family} label={f.label} correct={f.correct} total={f.total} />
        ))}
      </div>
    </div>
  );
}

function Bar({ label, hint, correct, total }: { label: string; hint?: string; correct: number; total: number }) {
  const p = pct(correct, total);
  return (
    <div className="grid grid-cols-[minmax(0,12rem)_1fr_3.5rem] items-center gap-3 text-[14px]">
      <span className="truncate text-ink" title={hint}>
        {label}
      </span>
      <span className="h-2 overflow-hidden rounded-full bg-paper">
        <span className="block h-full rounded-full bg-ink-soft" style={{ width: `${Math.max(p, 2)}%` }} title={`${p}% correct`} />
      </span>
      <span className="text-right tabular-nums text-ink-soft">
        {correct}/{total}
      </span>
    </div>
  );
}
