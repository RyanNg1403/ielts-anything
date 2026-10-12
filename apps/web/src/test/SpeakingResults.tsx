import { SPEAKING_CRITERIA, SPEAKING_CRITERION_NAMES, type SpeakingResult } from "@ielts/spec";
import { SpeakingBands } from "../components/cards/SpeakingCards.tsx";
import type { SpeakingPayload } from "../data.ts";
import { exitTest } from "../router.ts";

/** Speaking results: bands, examiner-style feedback with the learner's own words, and the interview. */
export function SpeakingResults({ data, result }: { data: SpeakingPayload; result: SpeakingResult }) {
  const a = result.assessment;
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
      <main className="mx-auto max-w-[680px] px-6 py-12">
        <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink">{data.test.title}</h1>
        <div className="mt-8 rounded-2xl border border-rule bg-surface p-6 shadow-[var(--shadow-card)]">
          <SpeakingBands result={result} />
        </div>
        {data.attempt?.recording && (
          <section className="mt-8">
            <h2 className="font-serif text-[18px] text-ink">Listen to your interview</h2>
            <audio controls preload="metadata" src={`/api/attempts/${data.attempt.id}/recording`} className="mt-3 w-full" />
          </section>
        )}

        {a && (
          <>
            {SPEAKING_CRITERIA.map((c) => (
              <section key={c} className="mt-12">
                <h2 className="flex items-baseline justify-between gap-4 font-serif text-[21px] text-ink">
                  <span>{SPEAKING_CRITERION_NAMES[c]}</span>
                  <span className="tabular-nums">{a[c].band}</span>
                </h2>
                <p className="mt-3 text-[15.5px] leading-relaxed text-ink">{a[c].summary}</p>
                {a[c].strengths.length > 0 && (
                  <ul className="mt-5 space-y-3">
                    {a[c].strengths.map((s, i) => (
                      <li key={i} className="text-[15px] leading-relaxed">
                        <q className="font-serif text-ink">{s.quote}</q>
                        <span className="text-ink-soft"> {s.note}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {a[c].improvements.length > 0 && (
                  <ul className="mt-5 space-y-3">
                    {a[c].improvements.map((s, i) => (
                      <li key={i} className="rounded-xl bg-surface px-4 py-3 text-[15px] leading-relaxed shadow-[var(--shadow-card)]">
                        <p>
                          <q className="font-serif text-ink-soft line-through decoration-danger/60">{s.quote}</q>
                        </p>
                        <p className="mt-1 font-serif text-ink">{s.better}</p>
                        <p className="mt-1.5 text-[14px] text-ink-soft">{s.issue}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section className="mt-12">
              <h2 className="font-serif text-[21px] text-ink">What to practise next</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15.5px] leading-relaxed text-ink">
                {a.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </section>
          </>
        )}

        <details className="group mt-12 rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-serif text-[18px] text-ink">
            The interview
            <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-ink-faint transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="m4 6 4 4 4-4" />
            </svg>
          </summary>
          <div className="space-y-3 border-t border-rule px-5 py-5">
            {result.transcript.map((l, i) => {
              const newPart = i === 0 || result.transcript[i - 1]!.part !== l.part;
              return (
                <div key={i}>
                  {newPart && <p className="pt-2 pb-1 text-[13px] text-ink-faint">Part {l.part}</p>}
                  <p className={`text-[15px] leading-relaxed ${l.role === "examiner" ? "text-ink-soft" : "font-serif text-ink"}`}>
                    <span className="sr-only">{l.role === "examiner" ? "Examiner: " : "You: "}</span>
                    {l.text}
                  </p>
                </div>
              );
            })}
            {result.transcript.length === 0 && <p className="text-[15px] text-ink-soft">Nothing was recorded.</p>}
          </div>
        </details>
        {result.examinerSaid && (
          <details className="group mt-4 rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-serif text-[18px] text-ink">
              What the examiner said
              <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-ink-faint transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="m4 6 4 4 4-4" />
              </svg>
            </summary>
            <p className="border-t border-rule px-5 py-5 text-[15px] leading-relaxed text-ink">{result.examinerSaid}</p>
          </details>
        )}
      </main>
    </div>
  );
}
