import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { blockQuestions, type MarkedItem } from "@ielts/spec";
import { submitAttempt, useTest, type ReadingPayload } from "../data.ts";
import { ConfirmDialog } from "../components/ConfirmDialog.tsx";
import { SpeakingScreen } from "./SpeakingScreen.tsx";
import { askTutor, exitTest, go } from "../router.ts";
import { findEvidence, PassageView, type Highlight } from "./Passage.tsx";
import { QuestionsView } from "./Questions.tsx";
import { Results } from "./Results.tsx";

const minutesFor = (mode: string, questions: number) => (mode === "full" ? 60 : Math.max(10, Math.round(questions * 1.5)));

type TestRoute = { id: string; review: boolean; q: number | null; part: number | null };

/** Full-screen test view: Speaking has its own room; Reading uses the computer-IELTS layout. */
export function TestScreen(props: TestRoute) {
  const { data, error } = useTest(props.id);
  if (data?.kind === "speaking") return <SpeakingScreen data={data} />;
  return <ReadingScreen {...props} data={data as ReadingPayload | undefined} error={error} />;
}

function ReadingScreen({ id, review: reviewRoute, q: startQ, part: startPart, data, error }: TestRoute & { data: ReadingPayload | undefined; error: string | null }) {
  const test = data?.test;
  const attempt = data?.attempt ?? null;
  const reviewing = !!attempt && reviewRoute;

  const parts = useMemo(() => test?.passages.map((p) => p.blocks.flatMap(blockQuestions)) ?? [], [test]);
  const allQs = parts.flat();
  const [part, setPart] = useState(0);
  const [current, setCurrent] = useState<number | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [highlights, setHighlights] = useState<Record<number, Highlight[]>>({});
  const [elapsed, setElapsed] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [evidenceQ, setEvidenceQ] = useState<number | null>(null);

  // Restore saved answers (or the submitted attempt), then jump to the requested part/question.
  useEffect(() => {
    if (!test || loaded) return;
    (async () => {
      // An untaken test always starts fresh: nothing from an earlier, abandoned sitting is kept.
      if (attempt) {
        setResponses(attempt.responses);
        setElapsed(attempt.elapsed_sec ?? 0);
        try {
          setHighlights(JSON.parse(localStorage.getItem(`hl:${id}`) ?? "{}"));
        } catch {}
      } else {
        try {
          localStorage.removeItem(`hl:${id}`);
        } catch {}
      }
      const p = startPart ? startPart - 1 : startQ ? parts.findIndex((qs) => qs.includes(startQ)) : 0;
      setPart(Math.max(0, p));
      setCurrent(startQ ?? parts[Math.max(0, p)]?.[0] ?? null);
      if (startQ && reviewRoute) setEvidenceQ(startQ);
      setLoaded(true);
    })();
  }, [test, attempt, loaded, id, parts, startPart, startQ, reviewRoute]);

  const limitSec = test ? minutesFor(test.mode, allQs.length) * 60 : 0;
  const remaining = Math.max(0, limitSec - elapsed);

  // The clock while the test is being taken. Answers are not saved until submission: leaving resets the test.
  useEffect(() => {
    if (!loaded || attempt) return;
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(tick);
  }, [loaded, attempt]);
  const latest = useRef({ responses, elapsed });
  latest.current = { responses, elapsed };
  const onAnswer = useCallback((q: number, value: string) => {
    setResponses((r) => ({ ...r, [q]: value }));
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitAttempt(id, latest.current.responses, latest.current.elapsed);
      setConfirming(false);
      go({ name: "test", id, review: false, q: null, part: null });
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [id]);

  // Time is up: submit what is there, as the computer test does.
  useEffect(() => {
    if (loaded && !attempt && limitSec && remaining === 0 && !submitting) submit();
  }, [remaining, loaded, attempt, limitSec, submitting, submit]);

  const review = useMemo(() => (reviewing ? new Map<number, MarkedItem>(attempt!.result.items.map((i) => [i.q, i])) : null), [reviewing, attempt]);

  const focusQ = (q: number) => {
    setCurrent(q);
    const p = parts.findIndex((qs) => qs.includes(q));
    if (p !== -1 && p !== part) setPart(p);
  };
  const jump = (q: number) => {
    focusQ(q);
    setEvidenceQ(review ? q : null);
    requestAnimationFrame(() => {
      document.getElementById(`q-${q}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById(`gap-${q}`)?.focus({ preventScroll: true });
    });
  };

  if (error) return <Centered>{error}</Centered>;
  if (!test || !loaded) return <Centered>Opening test…</Centered>;

  // A scored test opened without /review shows its results first.
  if (attempt && !reviewRoute) return <Results data={data!} />;

  const passage = test.passages[part]!;
  const evidenceItem = evidenceQ && review ? review.get(evidenceQ) : null;
  const evidence = evidenceItem ? evidenceItem.key.evidence.map((e) => findEvidence(passage.paragraphs, e)).find(Boolean) ?? null : null;
  const unanswered = allQs.filter((q) => !(responses[q] ?? "").trim()).length;
  const leave = () => exitTest(data!.conversationId ? { name: "chat", id: data!.conversationId } : { name: "tests" });
  const answeredAny = allQs.length > unanswered || Object.values(highlights).some((h) => h.length);
  // Leaving an untaken test throws the sitting away, so ask first if there is anything to lose.
  const exit = () => (reviewing || !answeredAny ? leave() : setLeaving(true));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-rule bg-surface px-4">
        <button onClick={exit} className="rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-paper hover:text-ink">
          {reviewing ? "Back" : "Exit"}
        </button>
        <p className="min-w-0 flex-1 truncate text-center font-serif text-[16px] font-semibold text-ink">{test.title}</p>
        {reviewing ? (
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">{attempt!.result.raw}</span> / {attempt!.result.total}
            {attempt!.result.band != null && <span className="ml-3 font-semibold text-ink">Band {attempt!.result.band.toFixed(1)}</span>}
          </p>
        ) : (
          <>
            <Clock remaining={remaining} />
            <button onClick={() => setConfirming(true)} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-on-primary hover:bg-primary-hover">
              Submit
            </button>
          </>
        )}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="min-h-0 overflow-y-auto border-rule bg-surface lg:border-r">
          <PassageView
            passage={passage}
            number={part + 1}
            highlights={highlights[part] ?? []}
            onHighlightsChange={(h) => {
              const next = { ...highlights, [part]: h };
              setHighlights(next);
              try {
                localStorage.setItem(`hl:${id}`, JSON.stringify(next));
              } catch {}
            }}
            evidence={evidence}
          />
        </div>
        <div className="min-h-0 overflow-y-auto">
          <QuestionsView
            passage={passage}
            number={part + 1}
            responses={responses}
            onAnswer={onAnswer}
            current={current}
            onFocusQ={(q) => {
              focusQ(q);
              if (review) setEvidenceQ(q);
            }}
            flagged={flagged}
            onToggleFlag={(q) => setFlagged((f) => (f.has(q) ? new Set([...f].filter((x) => x !== q)) : new Set(f).add(q)))}
            review={review}
            onShowEvidence={(q) => setEvidenceQ(q)}
            onAskTutor={(q) => data!.conversationId && askTutor(data!.conversationId, `Explain question ${q} in "${test.title}".`)}
          />
        </div>
      </div>

      <Navigator parts={parts} part={part} current={current} responses={responses} flagged={flagged} review={review} onPart={(p) => jump(parts[p]![0]!)} onJump={jump} />

      {leaving && (
        <ConfirmDialog title="Leave the test?" action="Leave" onCancel={() => setLeaving(false)} onConfirm={leave}>
          Your answers will be cleared, and the test starts from the beginning next time.
        </ConfirmDialog>
      )}
      {confirming && (
        <Dialog onClose={() => setConfirming(false)}>
          <h2 className="font-serif text-xl font-semibold text-ink">Submit your answers?</h2>
          <p className="mt-2 text-[15px] text-ink-soft">
            {unanswered === 0 ? "You have answered every question." : `${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered.`}
            {flagged.size > 0 && ` ${flagged.size} flagged for review.`} You can't change answers after submitting.
          </p>
          {submitError && <p className="mt-3 text-sm text-danger">{submitError}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setConfirming(false)} className="rounded-lg border border-rule-strong px-4 py-2 text-sm text-ink hover:bg-paper">
              Keep working
            </button>
            <button onClick={submit} disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-50">
              {submitting ? "Marking…" : "Submit"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Clock({ remaining }: { remaining: number }) {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const low = remaining <= 300;
  return (
    <span aria-live={low ? "polite" : "off"} className={`font-mono text-[15px] tabular-nums ${low ? "font-semibold text-danger" : "text-ink"}`} title="Time remaining">
      {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

function Navigator({
  parts,
  part,
  current,
  responses,
  flagged,
  review,
  onPart,
  onJump,
}: {
  parts: number[][];
  part: number;
  current: number | null;
  responses: Record<string, string>;
  flagged: Set<number>;
  review: Map<number, MarkedItem> | null;
  onPart: (p: number) => void;
  onJump: (q: number) => void;
}) {
  const all = parts.flat();
  const i = current ? all.indexOf(current) : -1;
  return (
    <nav aria-label="Questions" className="flex shrink-0 items-center gap-3 overflow-x-auto border-t border-rule bg-surface px-3 py-2">
      {parts.map((qs, p) => {
        const answered = qs.filter((q) => (responses[q] ?? "").trim()).length;
        const correct = review ? qs.filter((q) => review.get(q)?.correct).length : 0;
        return (
          <div key={p} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 ${p === part ? "bg-paper" : ""}`}>
            <button onClick={() => onPart(p)} className="mr-1 text-[13px] font-semibold whitespace-nowrap text-ink">
              Part {p + 1}
              <span className="ml-1.5 font-normal text-ink-soft">
                {review ? `${correct}/${qs.length}` : `${answered}/${qs.length}`}
              </span>
            </button>
            {p === part &&
              qs.map((q) => {
                const r = review?.get(q);
                const done = (responses[q] ?? "").trim();
                return (
                  <button
                    key={q}
                    onClick={() => onJump(q)}
                    aria-label={`Question ${q}`}
                    aria-current={q === current ? "true" : undefined}
                    className={`relative size-7 shrink-0 rounded text-[12px] font-semibold ${
                      r ? (r.correct ? "bg-correct-wash text-reading" : "bg-wrong-fill text-danger") : done ? "bg-primary text-on-primary" : "border border-rule-strong bg-surface text-ink"
                    } ${q === current ? "ring-2 ring-primary ring-offset-1" : ""}`}
                  >
                    {q}
                    {!review && flagged.has(q) && <span className="absolute -top-1 -right-1 size-2 rounded-full bg-writing" />}
                  </button>
                );
              })}
          </div>
        );
      })}
      <div className="ml-auto flex shrink-0 gap-1">
        <button disabled={i <= 0} onClick={() => onJump(all[i - 1]!)} aria-label="Previous question" className="rounded-md border border-rule-strong px-3 py-1 text-ink disabled:opacity-30">
          ←
        </button>
        <button disabled={i === -1 || i >= all.length - 1} onClick={() => onJump(all[i + 1]!)} aria-label="Next question" className="rounded-md border border-rule-strong px-3 py-1 text-ink disabled:opacity-30">
          →
        </button>
      </div>
    </nav>
  );
}

export function Dialog({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim px-4" onClick={onClose}>
      <div role="dialog" aria-modal className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper text-ink-soft">{children}</div>;
}
