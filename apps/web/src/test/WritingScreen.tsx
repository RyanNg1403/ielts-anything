// Writing test in the computer-delivered layout: the task on the left, the answer box on the
// right with a live word count, a tab per task and one clock for the whole test.
import { useCallback, useEffect, useRef, useState } from "react";
import { WRITING_MIN_WORDS, WRITING_WRAPPER, writingMinutes, writingTasks, writingWordCount, type WritingResult, type WritingTaskNumber, type WritingTest } from "@ielts/spec";
import { ConfirmDialog } from "../components/ConfirmDialog.tsx";
import { isMarking, submitWriting, useTest, type WritingPayload } from "../data.ts";
import { exitTest } from "../router.ts";
import { Task1Figures } from "./figures/Figure.tsx";
import { Clock, Dialog } from "./TestScreen.tsx";
import { WritingResults } from "./WritingResults.tsx";

type Drafts = Partial<Record<`${WritingTaskNumber}`, string>>;

export function WritingScreen({ data }: { data: WritingPayload }) {
  if (data.attempt && !isMarking(data.attempt)) return <WritingResults data={data} result={data.attempt.result as WritingResult} />;
  if (data.attempt) return <Marking data={data} />;
  return <Sitting data={data} />;
}

const back = (data: WritingPayload) => exitTest(data.conversationId ? { name: "chat", id: data.conversationId } : { name: "tests" });

function Marking({ data }: { data: WritingPayload }) {
  const { reload } = useTest(data.id);
  useEffect(() => {
    const t = setInterval(reload, 4000);
    return () => clearInterval(t);
  }, [reload]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <header className="flex h-14 shrink-0 items-center border-b border-rule bg-surface px-4">
        <button onClick={() => back(data)} className="rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-paper hover:text-ink">
          Back
        </button>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span aria-hidden className="size-8 animate-spin rounded-full border-2 border-rule-strong border-t-ink" />
        <p className="mt-2 font-serif text-[24px] text-ink">Marking your writing</p>
        <p className="max-w-sm text-[15px] text-ink-soft">This takes a few minutes. You can leave: the result will appear in your chat.</p>
      </div>
    </div>
  );
}

/** The task exactly as printed: wording from the Cambridge papers, then the figures. */
export function TaskPaper({ test, n }: { test: WritingTest; n: WritingTaskNumber }) {
  const w = WRITING_WRAPPER[n];
  return (
    <div className="px-6 py-6 text-ink sm:px-8">
      <h2 className="font-serif text-[20px] font-semibold">Task {n}</h2>
      <p className="mt-3 text-[15px]">{w.time}</p>
      {n === 2 && <p className="mt-3 text-[15px]">{WRITING_WRAPPER[2].lead}</p>}
      <div className="mt-3 border border-ink px-4 py-3 text-[15px] font-semibold italic leading-relaxed">
        {n === 1 ? (
          <>
            <p>{test.task1!.intro}</p>
            <p className="mt-3">{WRITING_WRAPPER[1].directive}</p>
          </>
        ) : (
          <>
            <p>{test.task2!.statement}</p>
            {test.task2!.questions.map((q) => (
              <p key={q} className="mt-3">
                {q}
              </p>
            ))}
          </>
        )}
      </div>
      {n === 2 && <p className="mt-3 text-[15px]">{WRITING_WRAPPER[2].directive}</p>}
      <p className="mt-3 text-[15px]">{w.length}</p>
      {n === 1 && (
        <div className="mt-6">
          <Task1Figures task={test.task1!} />
        </div>
      )}
    </div>
  );
}

function Sitting({ data }: { data: WritingPayload }) {
  const test = data.test;
  const tasks = writingTasks(test);
  const key = `writing:${data.id}`;
  // A reload or an accidental exit must not lose an essay: drafts stay on this device until submitted.
  const saved = useRef<{ drafts: Drafts; elapsed: number } | null>(null);
  if (saved.current === null) {
    try {
      saved.current = JSON.parse(localStorage.getItem(key) ?? "null") ?? { drafts: {}, elapsed: 0 };
    } catch {
      saved.current = { drafts: {}, elapsed: 0 };
    }
  }
  const [task, setTask] = useState<WritingTaskNumber>(tasks[0]!);
  const [drafts, setDrafts] = useState<Drafts>(saved.current!.drafts);
  const [elapsed, setElapsed] = useState(saved.current!.elapsed);
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = writingMinutes(test) * 60;
  const remaining = Math.max(0, limit - elapsed);
  const latest = useRef({ drafts, elapsed });
  latest.current = { drafts, elapsed };

  useEffect(() => {
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ drafts, elapsed }));
    } catch {}
  }, [key, drafts, elapsed]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitWriting(data.id, latest.current.drafts, latest.current.elapsed);
      try {
        localStorage.removeItem(key);
      } catch {}
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }, [data.id, key]);

  // Time is up: submit what is there, as the computer test does (once; a failure shows in the dialog).
  const timedOut = useRef(false);
  useEffect(() => {
    if (remaining > 0 || timedOut.current) return;
    timedOut.current = true;
    setConfirming(true);
    submit();
  }, [remaining, submit]);

  const words = (n: WritingTaskNumber) => writingWordCount(drafts[`${n}`] ?? "");
  const short = tasks.filter((n) => words(n) < WRITING_MIN_WORDS[n]);
  const wroteAny = tasks.some((n) => (drafts[`${n}`] ?? "").trim());

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-rule bg-surface px-4">
        <button onClick={() => (wroteAny ? setLeaving(true) : back(data))} className="rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-paper hover:text-ink">
          Exit
        </button>
        <p className="min-w-0 flex-1 truncate text-center font-serif text-[16px] font-semibold text-ink">{test.title}</p>
        <Clock remaining={remaining} />
        <button onClick={() => setConfirming(true)} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-on-primary hover:bg-primary-hover">
          Submit
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-2 lg:grid-rows-1">
        <div className="min-h-0 overflow-y-auto border-b border-rule bg-surface lg:border-r lg:border-b-0">
          <TaskPaper test={test} n={task} />
        </div>
        <div className="flex min-h-0 flex-col">
          <label htmlFor={`answer-${task}`} className="sr-only">
            Your answer to Task {task}
          </label>
          <textarea
            id={`answer-${task}`}
            key={task}
            value={drafts[`${task}`] ?? ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [`${task}`]: e.target.value }))}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            placeholder={`Write your answer to Task ${task} here.`}
            className="min-h-0 flex-1 resize-none bg-paper px-6 py-6 font-serif text-[17px] leading-[1.7] text-ink outline-none placeholder:text-ink-faint sm:px-8"
          />
          <p className="shrink-0 border-t border-rule bg-surface px-6 py-2 text-right text-[13px] text-ink-soft tabular-nums sm:px-8">Words: {words(task)}</p>
        </div>
      </div>

      {tasks.length > 1 && (
        <nav aria-label="Tasks" className="flex shrink-0 gap-2 border-t border-rule bg-surface px-3 py-2">
          {tasks.map((n) => (
            <button
              key={n}
              onClick={() => setTask(n)}
              aria-current={n === task ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${n === task ? "bg-primary text-on-primary" : "border border-rule-strong text-ink hover:bg-paper"}`}
            >
              Task {n}
              <span className={`ml-2 font-normal ${n === task ? "text-on-primary/80" : "text-ink-soft"}`}>{words(n)} words</span>
            </button>
          ))}
        </nav>
      )}

      {leaving && (
        <ConfirmDialog title="Leave the test?" action="Leave" onCancel={() => setLeaving(false)} onConfirm={() => back(data)}>
          Your writing is saved on this device. When you open the test again, you continue where you left off, with the time you have left.
        </ConfirmDialog>
      )}
      {confirming && (
        <Dialog onClose={() => setConfirming(false)}>
          <h2 className="font-serif text-xl font-semibold text-ink">Submit your writing?</h2>
          <ul className="mt-3 space-y-1 text-[15px] text-ink">
            {tasks.map((n) => (
              <li key={n}>
                Task {n}: {words(n)} words
                {words(n) < WRITING_MIN_WORDS[n] && <span className="text-danger"> (at least {WRITING_MIN_WORDS[n]} asked)</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[15px] text-ink-soft">
            {short.length ? "Short answers lose marks. " : ""}You can't change your writing after submitting.
          </p>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setConfirming(false)} className="rounded-lg border border-rule-strong px-4 py-2 text-sm text-ink hover:bg-paper">
              Keep writing
            </button>
            <button onClick={submit} disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
