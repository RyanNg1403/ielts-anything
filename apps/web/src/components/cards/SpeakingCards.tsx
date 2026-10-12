import { SPEAKING_CRITERIA, SPEAKING_CRITERION_NAMES, SPEAKING_PART_NAMES, speakingMinutes, speakingParts, type SpeakingResult } from "@ielts/spec";
import { isMarking, type SpeakingPayload } from "../../data.ts";
import { go } from "../../router.ts";

const open = (id: string) => go({ name: "test", id, review: false, q: null, part: null });

export const partsLabel = (parts: number[]) => (parts.length === 1 ? `Part ${parts[0]}` : `Parts ${parts[0]}–${parts[parts.length - 1]}`);

/** Outline and length only: the questions stay hidden until the test is taken. */
export function speakingOutline(test: SpeakingPayload["test"]) {
  if ("parts" in test) return { parts: test.parts, minutes: test.minutes };
  return { parts: speakingParts(test), minutes: speakingMinutes(test) };
}

export function SpeakingTestCard({ data, className }: { data: SpeakingPayload; className: string }) {
  const { parts, minutes } = speakingOutline(data.test);
  const result = data.attempt && !isMarking(data.attempt) ? (data.attempt.result as SpeakingResult) : null;
  return (
    <button onClick={() => open(data.id)} className={className}>
      <div className="flex items-start gap-4 px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[22px] font-medium leading-snug text-ink">{data.test.title}</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Speaking · {partsLabel(parts)} · {minutes} min
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
      {parts.length > 1 && (
        <ol className="border-t border-rule px-5 py-3">
          {parts.map((p) => (
            <li key={p} className="flex items-baseline gap-3 py-1 text-[15px]">
              <span className="w-4 shrink-0 text-ink-faint">{p}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{SPEAKING_PART_NAMES[p]}</span>
            </li>
          ))}
        </ol>
      )}
    </button>
  );
}

/** Band per criterion. Shared by the chat score card and the results page. */
export function SpeakingBands({ result, compact }: { result: SpeakingResult; compact?: boolean }) {
  if (!result.assessment) return <p className="text-[15px] text-ink-soft">{result.unmarked}</p>;
  const a = result.assessment;
  return (
    <div>
      <p>
        <span className={`block font-serif font-semibold leading-none text-ink ${compact ? "text-[44px]" : "text-[64px]"}`}>{result.band?.toFixed(1)}</span>
        <span className="mt-1 block text-sm text-ink-soft">Estimated band</span>
      </p>
      <div className="mt-6 space-y-2">
        {SPEAKING_CRITERIA.map((c) => (
          <div key={c} className="grid grid-cols-[minmax(0,15rem)_1fr_2rem] items-center gap-3 text-[14px]">
            <span className="truncate text-ink">{SPEAKING_CRITERION_NAMES[c]}</span>
            <span className="h-2 overflow-hidden rounded-full bg-paper">
              <span className="block h-full rounded-full bg-ink-soft" style={{ width: `${(a[c].band / 9) * 100}%` }} />
            </span>
            <span className="text-right tabular-nums text-ink">{a[c].band}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SpeakingScoreCard({ data, className }: { data: SpeakingPayload; className: string }) {
  if (!data.attempt) return null;
  return (
    <button onClick={() => open(data.id)} className={`${className} px-5 py-5`}>
      <p className="mb-4 font-serif text-[18px] font-medium text-ink">{data.test.title}</p>
      {isMarking(data.attempt) ? <p className="text-[15px] text-ink-soft">Marking your speaking…</p> : <SpeakingBands result={data.attempt.result as SpeakingResult} compact />}
    </button>
  );
}
