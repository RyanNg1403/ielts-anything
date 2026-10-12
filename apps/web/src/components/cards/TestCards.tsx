import { createContext } from "react";
import { blockQuestions, questionPrompts, type ReadingTest } from "@ielts/spec";
import { useLibrary, useTest } from "../../data.ts";
import { go } from "../../router.ts";
import { ScoreSummary } from "../ScoreSummary.tsx";
import { SpeakingScoreCard, SpeakingTestCard } from "./SpeakingCards.tsx";

/** Lets cards send chat messages on the learner's behalf. */
export const ChatActions = createContext<{ send: (text: string) => void; busy: boolean }>({ send: () => {}, busy: false });

const shell = "block w-full overflow-hidden rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)] text-left";
const clickable = `${shell} transition-[border-color,box-shadow] hover:border-rule-strong hover:shadow-[var(--shadow-float)]`;

function Skeleton() {
  return <div className={`${shell} h-28 animate-pulse`} />;
}

/** Stands in for a card whose test was deleted (or failed to load). */
function Gone({ error }: { error: string }) {
  return <p className="rounded-2xl border border-dashed border-rule px-5 py-4 text-[14px] text-ink-faint">{/not found/i.test(error) ? "This test was deleted." : error}</p>;
}

const countQs = (t: ReadingTest) => t.passages.reduce((n, p) => n + p.blocks.flatMap(blockQuestions).length, 0);

/** A published test. Click anywhere to take it (or see its results once scored). */
export function TestCard({ testId }: { testId: string }) {
  const { data, error } = useTest(testId);
  const { data: lib } = useLibrary();
  if (error) return <Gone error={error} />;
  if (!data) return <Skeleton />;
  if (data.kind === "speaking") return <SpeakingTestCard data={data} className={clickable} />;
  const t = data.test;
  const row = lib?.find((r) => r.id === testId);
  const questions = countQs(t);
  const minutes = t.mode === "full" ? 60 : Math.max(10, Math.round(questions * 1.5));
  const result = data.attempt?.result;
  const answered = row?.answeredCount ?? 0;

  return (
    <button onClick={() => go({ name: "test", id: testId, review: false, q: null, part: null })} className={clickable}>
      <div className="flex items-start gap-4 px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[22px] font-medium leading-snug text-ink">{t.title}</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Reading · {questions} questions · {minutes} min
            {!result && answered > 0 && ` · ${answered} answered`}
          </p>
        </div>
        {result ? (
          <span className="font-serif text-[26px] font-semibold leading-none tabular-nums text-ink">
            {result.band != null ? result.band.toFixed(1) : `${result.raw}/${result.total}`}
          </span>
        ) : (
          <svg aria-hidden viewBox="0 0 16 16" className="mt-2 size-4 shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 3.5 10.5 8 6 12.5" />
          </svg>
        )}
      </div>
      {t.passages.length > 1 && (
        <ol className="border-t border-rule px-5 py-3">
          {t.passages.map((p, i) => (
            <li key={i} className="flex items-baseline gap-3 py-1 text-[15px]">
              <span className="w-4 shrink-0 text-ink-faint">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{p.title}</span>
            </li>
          ))}
        </ol>
      )}
    </button>
  );
}

/** Score summary after submission. Click to open the full results. */
export function ScoreCard({ testId }: { testId: string }) {
  const { data, error } = useTest(testId);
  if (error) return <Gone error={error} />;
  if (!data) return <Skeleton />;
  if (data.kind === "speaking") return <SpeakingScoreCard data={data} className={clickable} />;
  if (!data.attempt) return null;
  return (
    <button onClick={() => go({ name: "test", id: testId, review: false, q: null, part: null })} className={`${clickable} px-5 py-5`}>
      <p className="mb-4 font-serif text-[18px] font-medium text-ink">{data.test.title}</p>
      <ScoreSummary test={data.test} result={data.attempt.result} elapsedSec={data.attempt.elapsed_sec} compact />
    </button>
  );
}

/** The tutor's explanations for specific questions, with the passage evidence. */
export function ExplainCard({ testId, items }: { testId: string; items: { q: number; explanation: string }[] }) {
  const { data, error } = useTest(testId);
  if (error) return <Gone error={error} />;
  if (!data) return <Skeleton />;
  if (data.kind !== "reading" || !data.attempt) return null;
  const prompts = questionPrompts(data.test);
  const marked = new Map(data.attempt.result.items.map((i) => [i.q, i]));
  return (
    <article className={`${shell} divide-y divide-rule`}>
      {items.map(({ q, explanation }) => {
        const m = marked.get(q);
        if (!m) return null;
        const quote = m.key.evidence.find(Boolean);
        return (
          <section key={q} className="px-5 py-4">
            <button onClick={() => go({ name: "test", id: testId, review: true, q, part: null })} className="flex w-full items-baseline gap-3 text-left">
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${m.correct ? "bg-correct-wash text-reading" : "bg-wrong-fill text-danger"}`}>{q}</span>
              <span className="flex-1 text-[15px] text-ink hover:underline">{prompts[q]}</span>
            </button>
            <p className="mt-2 pl-10 text-[14px] text-ink">
              {m.correct ? (
                <>
                  Your answer <strong>{m.given}</strong> is correct.
                </>
              ) : (
                <>
                  {m.given ? (
                    <>
                      You wrote <s className="text-danger">{m.given}</s>.{" "}
                    </>
                  ) : (
                    "No answer. "
                  )}
                  Answer: <strong>{m.key.display}</strong>
                </>
              )}
            </p>
            {quote && <blockquote className="mt-3 ml-10 rounded-lg bg-paper px-4 py-3 font-serif text-[15px] leading-relaxed text-ink">{quote}</blockquote>}
            <p className="mt-3 pl-10 text-[15px] leading-relaxed text-ink">{explanation}</p>
          </section>
        );
      })}
    </article>
  );
}
