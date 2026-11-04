import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  finalCheckSeconds,
  listeningInstructionsFor,
  listeningPartQuestions,
  locateInScript,
  type ListeningBlock,
  type ListeningPart,
  type ListeningTest,
  type MarkedItem,
} from "@ielts/spec";
import { ConfirmDialog } from "../components/ConfirmDialog.tsx";
import { retryAudio, submitAttempt, useTest, type AudioCue, type ListeningPayload } from "../data.ts";
import { askTutor, exitTest, go } from "../router.ts";
import { QuestionsView } from "./Questions.tsx";
import { Results } from "./Results.tsx";
import { Centered, Clock, Dialog, Navigator } from "./TestScreen.tsx";

type Route = { id: string; review: boolean; q: number | null; part: number | null };
type Mode = "exam" | "practice";

const audioUrl = (id: string, part: number) => `/api/tests/${id}/audio/${part + 1}`;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function ListeningScreen({ data, ...route }: Route & { data: ListeningPayload }) {
  const { reload } = useTest(data.id);
  // The recording is made in the background: keep checking until it is ready.
  useEffect(() => {
    if (data.audio.status !== "rendering") return;
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [data.audio.status, reload]);

  if (data.attempt && !route.review) return <Results data={data} />;
  if (data.attempt) return <ListeningReview data={data} startQ={route.q} />;
  return <ListeningSitting data={data} />;
}

/* ---------- taking the test ---------- */

function ListeningSitting({ data }: { data: ListeningPayload }) {
  const { id, test, audio } = data;
  const parts = useMemo(() => test.parts.map(listeningPartQuestions), [test]);
  const allQs = parts.flat();
  const [mode, setMode] = useState<Mode>("exam");
  const [phase, setPhase] = useState<"intro" | "playing" | "checking">("intro");
  const [part, setPart] = useState(0);
  const [playing, setPlaying] = useState(0);
  const [current, setCurrent] = useState<number | null>(allQs[0] ?? null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const player = useRef<HTMLAudioElement>(null);

  const durations = audio.status === "ready" ? audio.parts.map((p) => p.duration) : [];
  const limitSec = Math.ceil(durations.reduce((a, b) => a + b, 0)) + finalCheckSeconds(test);
  const remaining = Math.max(0, limitSec - elapsed);

  useEffect(() => {
    if (phase === "intro") return;
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(tick);
  }, [phase]);

  const latest = useRef({ responses, elapsed });
  latest.current = { responses, elapsed };
  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      player.current?.pause();
      await submitAttempt(id, latest.current.responses, latest.current.elapsed);
      setConfirming(false);
      go({ name: "test", id, review: false, q: null, part: null });
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [id]);

  // Exam mode keeps to the clock: the recording, then the checking time, then the paper is collected.
  useEffect(() => {
    if (mode === "exam" && phase !== "intro" && remaining === 0 && !submitting) submit();
  }, [mode, phase, remaining, submitting, submit]);

  const playPart = (p: number) => {
    const el = player.current;
    if (!el) return;
    setPlaying(p);
    setPart(p);
    setCurrent(parts[p]?.[0] ?? null);
    el.src = audioUrl(id, p);
    el.play().catch(() => {});
  };

  const start = () => {
    setPhase("playing");
    playPart(0);
  };

  const onEnded = () => {
    if (playing + 1 < test.parts.length) playPart(playing + 1);
    else setPhase("checking");
  };

  const jump = (q: number) => {
    setCurrent(q);
    const p = parts.findIndex((qs) => qs.includes(q));
    if (p !== -1) setPart(p);
    requestAnimationFrame(() => {
      document.getElementById(`q-${q}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById(`gap-${q}`)?.focus({ preventScroll: true });
    });
  };

  const leave = () => exitTest(data.conversationId ? { name: "chat", id: data.conversationId } : { name: "tests" });
  const unanswered = allQs.filter((q) => !(responses[q] ?? "").trim()).length;

  // One audio element for the whole sitting, mounted before Start so the click can begin playback.
  const audioEl = (
    <audio
      ref={player}
      preload="auto"
      onEnded={onEnded}
      onPause={(e) => {
        // The real test cannot be paused (media keys included).
        if (mode === "exam" && phase === "playing" && !e.currentTarget.ended) e.currentTarget.play().catch(() => {});
      }}
    />
  );
  const shown = test.parts[part]!;
  return (
    <>
      {audioEl}
      {phase === "intro" ? (
        <Intro data={data} mode={mode} onMode={setMode} onStart={start} onLeave={leave} limitSec={limitSec} />
      ) : (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-rule bg-surface px-4">
        <button onClick={() => (allQs.length > unanswered ? setLeaving(true) : leave())} className="rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-paper hover:text-ink">
          Exit
        </button>
        <p className="min-w-0 flex-1 truncate text-center font-serif text-[16px] font-semibold text-ink">{test.title}</p>
        {mode === "exam" ? <Clock remaining={remaining} /> : <span className="font-mono text-[15px] tabular-nums text-ink-soft" title="Time so far">{mmss(elapsed)}</span>}
        <button onClick={() => setConfirming(true)} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-on-primary hover:bg-primary-hover">
          Submit
        </button>
      </header>

      <AudioBar
        player={player}
        mode={mode}
        partLabel={phase === "checking" ? "Recording finished" : `Part ${test.parts[playing]!.number}`}
        parts={mode === "practice" ? test.parts.map((p) => `Part ${p.number}`) : null}
        onPickPart={playPart}
      />
      {phase === "checking" && (
        <p className="shrink-0 border-b border-rule bg-listening-wash px-4 py-2 text-center text-[14px] text-ink">
          {mode === "exam" ? `The recording has finished. You have ${finalCheckSeconds(test) / 60} minute${finalCheckSeconds(test) > 60 ? "s" : ""} to check your answers.` : "The recording has finished. Submit when you're ready."}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl">
          <PartHeading part={shown} />
          <QuestionsView
            blocks={shown.blocks}
            instructions={(b) => listeningInstructionsFor(b as ListeningBlock)}
            responses={responses}
            onAnswer={(q, v) => setResponses((r) => ({ ...r, [q]: v }))}
            current={current}
            onFocusQ={setCurrent}
            flagged={flagged}
            onToggleFlag={(q) => setFlagged((f) => (f.has(q) ? new Set([...f].filter((x) => x !== q)) : new Set(f).add(q)))}
            review={null}
            onShowEvidence={() => {}}
            onAskTutor={() => {}}
          />
        </div>
      </div>

      <Navigator parts={parts} labels={test.parts.map((p) => `Part ${p.number}`)} part={part} current={current} responses={responses} flagged={flagged} review={null} onPart={(p) => jump(parts[p]![0]!)} onJump={jump} />

      {leaving && (
        <ConfirmDialog title="Leave the test?" action="Leave" onCancel={() => setLeaving(false)} onConfirm={leave}>
          Your answers will be cleared, and the test starts from the beginning next time.
        </ConfirmDialog>
      )}
      {confirming && (
        <Dialog onClose={() => setConfirming(false)}>
          <h2 className="font-serif text-xl font-semibold text-ink">Submit your answers?</h2>
          <p className="mt-2 text-[15px] text-ink-soft">
            {phase !== "checking" && "The recording is still playing. "}
            {unanswered === 0 ? "You have answered every question." : `${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered.`} You can't change answers after submitting.
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
      )}
    </>
  );
}


function PartHeading({ part }: { part: Pick<ListeningPart, "number" | "blocks"> }) {
  const qs = listeningPartQuestions(part);
  return (
    <div className="px-6 pt-8 sm:px-8">
      <h2 className="font-serif text-[22px] font-semibold text-ink">Part {part.number}</h2>
      <p className="mt-1 text-[14px] text-ink-soft">Listen and answer questions {qs[0]}–{qs[qs.length - 1]}.</p>
    </div>
  );
}

function Intro({
  data,
  mode,
  onMode,
  onStart,
  onLeave,
  limitSec,
}: {
  data: ListeningPayload;
  mode: Mode;
  onMode: (m: Mode) => void;
  onStart: () => void;
  onLeave: () => void;
  limitSec: number;
}) {
  const { test, audio } = data;
  const questions = test.parts.reduce((n, p) => n + listeningPartQuestions(p).length, 0);
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <header className="flex h-14 items-center border-b border-rule bg-surface px-4">
        <button onClick={onLeave} className="rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-paper hover:text-ink">
          Back
        </button>
      </header>
      <main className="mx-auto max-w-[640px] px-6 py-12">
        <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink">{test.title}</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Listening · {questions} questions{audio.status === "ready" && ` · about ${Math.round(limitSec / 60)} minutes`}
        </p>
        <ol className="mt-6 space-y-1.5 text-[15px]">
          {test.parts.map((p) => (
            <li key={p.number} className="flex gap-3">
              <span className="w-14 shrink-0 text-ink-faint">Part {p.number}</span>
              <span className="text-ink">{p.title}</span>
            </li>
          ))}
        </ol>

        {audio.status === "rendering" && (
          <div className="mt-8 rounded-2xl border border-rule bg-surface p-5 shadow-[var(--shadow-card)]">
            <p className="text-[15px] font-medium text-ink">Recording the audio…</p>
            <p className="mt-1 text-[14px] text-ink-soft">{audio.stage}. You can leave this screen; the test card shows when it is ready.</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper">
              <div className="h-full rounded-full bg-listening transition-[width] duration-700" style={{ width: `${Math.max(3, Math.round(audio.progress * 100))}%` }} />
            </div>
          </div>
        )}
        {audio.status === "failed" && (
          <div className="mt-8 rounded-2xl border border-wrong-line bg-wrong-wash p-5">
            <p className="text-[15px] font-medium text-ink">The audio could not be recorded.</p>
            <p className="mt-1 text-[14px] text-ink-soft">{audio.error}</p>
            <div className="mt-4 flex gap-2">
              <button
                disabled={retrying}
                onClick={async () => {
                  setRetrying(true);
                  await retryAudio(data.id).finally(() => setRetrying(false));
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-50"
              >
                Try again
              </button>
              <button onClick={() => go({ name: "settings" })} className="rounded-lg border border-rule-strong bg-surface px-4 py-2 text-sm text-ink hover:bg-paper">
                Voice settings
              </button>
            </div>
          </div>
        )}
        {audio.status === "ready" && (
          <>
            <div role="radiogroup" aria-label="How to take the test" className="mt-8 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["exam", "Exam mode", "The recording plays once, straight through, as in the real test. You can't pause it."],
                  ["practice", "Practice mode", "Pause, rewind and replay any part. No time limit."],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => onMode(value)}
                  className={`flex flex-col justify-start rounded-2xl border p-4 text-left transition-colors ${mode === value ? "border-primary bg-selected ring-1 ring-primary" : "border-rule bg-surface hover:border-rule-strong"}`}
                >
                  <span className="block text-[15px] font-semibold text-ink">{label}</span>
                  <span className="mt-1 block text-[14px] text-ink-soft">{hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-5 text-[14px] text-ink-soft">Use headphones or speakers in a quiet place. Each part starts with time to read its questions.</p>
            <button onClick={onStart} className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-[15px] font-medium text-on-primary hover:bg-primary-hover">
              Start the test
            </button>
          </>
        )}
      </main>
    </div>
  );
}

/** The recording's controls. Exam mode only has volume; practice mode can pause, rewind, seek and pick a part. */
function AudioBar({
  player,
  mode,
  partLabel,
  parts,
  onPickPart,
  onTime,
}: {
  player: React.RefObject<HTMLAudioElement | null>;
  mode: Mode;
  partLabel: string;
  parts: string[] | null;
  onPickPart: (p: number) => void;
  onTime?: (t: number) => void;
}) {
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(true);
  const [volume, setVolume] = useState(1);
  const exam = mode === "exam";
  useEffect(() => {
    const el = player.current;
    if (!el) return;
    const sync = () => {
      setTime(el.currentTime);
      setDuration(Number.isFinite(el.duration) ? el.duration : 0);
      setPaused(el.paused);
      onTime?.(el.currentTime);
    };
    const events = ["timeupdate", "loadedmetadata", "play", "pause", "emptied"] as const;
    events.forEach((ev) => el.addEventListener(ev, sync));
    sync();
    return () => events.forEach((ev) => el.removeEventListener(ev, sync));
  }, [player, onTime]);
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-rule bg-surface px-4 py-2 text-[13px]">
      {!exam && (
        <>
          <button
            onClick={() => (player.current?.paused ? player.current.play() : player.current?.pause())}
            aria-label={paused ? "Play" : "Pause"}
            className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary hover:bg-primary-hover"
          >
            {paused ? (
              <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" />
              </svg>
            )}
          </button>
          <button onClick={() => player.current && (player.current.currentTime = Math.max(0, player.current.currentTime - 10))} className="rounded-md px-2 py-1 text-ink-soft hover:bg-paper hover:text-ink">
            −10 s
          </button>
        </>
      )}
      <span className="shrink-0 font-semibold text-ink">{partLabel}</span>
      {exam ? (
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-paper" aria-hidden>
          <div className="h-full rounded-full bg-listening" style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} />
        </div>
      ) : (
        <input
          type="range"
          aria-label="Position in the recording"
          min={0}
          max={duration || 0}
          step={0.5}
          value={time}
          onChange={(e) => player.current && (player.current.currentTime = Number(e.target.value))}
          className="min-w-0 flex-1 accent-[var(--color-listening)]"
        />
      )}
      <span className="shrink-0 font-mono tabular-nums text-ink-soft">
        {mmss(time)} / {mmss(duration || 0)}
      </span>
      {parts && (
        <select aria-label="Play a part" value="" onChange={(e) => e.target.value && onPickPart(Number(e.target.value))} className="rounded-md border border-rule-strong bg-surface px-2 py-1 text-ink">
          <option value="">Play part…</option>
          {parts.map((p, i) => (
            <option key={i} value={i}>
              {p}
            </option>
          ))}
        </select>
      )}
      <label className="flex shrink-0 items-center gap-1.5 text-ink-soft">
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
          <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" />
          <path d="M11 5.5a3.5 3.5 0 0 1 0 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          type="range"
          aria-label="Volume"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            if (player.current) player.current.volume = Number(e.target.value);
          }}
          className="w-20 accent-[var(--color-listening)]"
        />
      </label>
    </div>
  );
}

/* ---------- review: transcript, audio and answers ---------- */

function ListeningReview({ data, startQ }: { data: ListeningPayload; startQ: number | null }) {
  const test = data.test as ListeningTest;
  const attempt = data.attempt!;
  const parts = useMemo(() => test.parts.map(listeningPartQuestions), [test]);
  const review = useMemo(() => new Map<number, MarkedItem>(attempt.result.items.map((i) => [i.q, i])), [attempt]);
  const startPart = startQ ? Math.max(0, parts.findIndex((qs) => qs.includes(startQ))) : 0;
  const [part, setPart] = useState(startPart);
  const [current, setCurrent] = useState<number | null>(startQ ?? parts[startPart]?.[0] ?? null);
  const [time, setTime] = useState(0);
  const player = useRef<HTMLAudioElement>(null);
  const cues = data.audio.status === "ready" ? data.audio.parts[part]?.cues ?? [] : [];
  const shown = test.parts[part]!;

  /** The transcript line where the current question's answer is heard. */
  const evidence = useMemo(() => {
    const item = current ? review.get(current) : null;
    if (!item) return null;
    for (const quote of item.key.evidence) {
      const loc = locateInScript(shown, quote);
      if (loc) return { section: loc.section, index: loc.index, quote };
    }
    return null;
  }, [current, review, shown]);

  const loadPart = (p: number) => {
    setPart(p);
    if (player.current && data.audio.status === "ready") player.current.src = audioUrl(data.id, p);
  };
  useEffect(() => loadPart(startPart), []);

  const seekToLine = (section: number, index: number, play = true) => {
    const cue = cues.find((c) => c.section === section && c.index === index);
    const el = player.current;
    if (!cue || !el) return;
    el.currentTime = Math.max(0, cue.start - 0.5);
    if (play) el.play().catch(() => {});
  };

  const focusQ = (q: number) => {
    setCurrent(q);
    const p = parts.findIndex((qs) => qs.includes(q));
    if (p !== -1 && p !== part) loadPart(p);
  };
  // Choosing a question shows where its answer is heard.
  useEffect(() => {
    if (!evidence) return;
    document.getElementById(`line-${evidence.section}-${evidence.index}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [evidence]);

  const jump = (q: number) => {
    focusQ(q);
    requestAnimationFrame(() => document.getElementById(`q-${q}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <audio ref={player} preload="auto" />
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-rule bg-surface px-4">
        <button onClick={() => go({ name: "test", id: data.id, review: false, q: null, part: null })} className="rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-paper hover:text-ink">
          Back
        </button>
        <p className="min-w-0 flex-1 truncate text-center font-serif text-[16px] font-semibold text-ink">{test.title}</p>
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink">{attempt.result.raw}</span> / {attempt.result.total}
          {attempt.result.band != null && <span className="ml-3 font-semibold text-ink">Band {attempt.result.band.toFixed(1)}</span>}
        </p>
      </header>
      {data.audio.status === "ready" ? (
        <AudioBar player={player} mode="practice" partLabel={`Part ${shown.number}`} parts={null} onPickPart={loadPart} onTime={setTime} />
      ) : (
        <p className="shrink-0 border-b border-rule bg-surface px-4 py-2 text-[13px] text-ink-soft">The recording is not available; the transcript is below.</p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="min-h-0 overflow-y-auto border-rule bg-surface lg:border-r">
          <Transcript part={shown} cues={cues} time={time} evidence={evidence} onLine={seekToLine} />
        </div>
        <div className="min-h-0 overflow-y-auto">
          <PartHeading part={shown} />
          <QuestionsView
            blocks={shown.blocks}
            instructions={(b) => listeningInstructionsFor(b as ListeningBlock)}
            responses={attempt.responses}
            onAnswer={() => {}}
            current={current}
            onFocusQ={focusQ}
            flagged={new Set()}
            onToggleFlag={() => {}}
            review={review}
            onShowEvidence={focusQ}
            onAskTutor={(q) => data.conversationId && askTutor(data.conversationId, `Explain question ${q} in "${test.title}".`)}
          />
        </div>
      </div>

      <Navigator
        parts={parts}
        labels={test.parts.map((p) => `Part ${p.number}`)}
        part={part}
        current={current}
        responses={attempt.responses}
        flagged={new Set()}
        review={review}
        onPart={(p) => jump(parts[p]![0]!)}
        onJump={jump}
      />
    </div>
  );
}

function Transcript({
  part,
  cues,
  time,
  evidence,
  onLine,
}: {
  part: ListeningPart;
  cues: AudioCue[];
  time: number;
  evidence: { section: number; index: number; quote: string } | null;
  onLine: (section: number, index: number) => void;
}) {
  const roles = new Map(part.speakers.map((s) => [s.id, s.role]));
  const speaking = cues.find((c) => c.section !== undefined && time >= c.start && time < c.end);
  return (
    <article className="px-6 py-8 sm:px-8">
      <h2 className="font-serif text-[22px] font-semibold text-ink">Transcript · Part {part.number}</h2>
      <p className="mt-1 text-[14px] italic text-ink-soft">{part.context}</p>
      {part.sections.map((s, si) => (
        <div key={si} className="mt-5 space-y-2.5">
          {si > 0 && <p className="text-center text-[13px] text-ink-faint">· · ·</p>}
          {s.lines.map((l, li) => {
            const isEvidence = evidence?.section === si && evidence.index === li;
            const isSpeaking = speaking?.section === si && speaking.index === li;
            return (
              <p
                key={li}
                id={`line-${si}-${li}`}
                onClick={() => onLine(si, li)}
                title={cues.length ? "Play from here" : undefined}
                className={`cursor-pointer rounded-md px-2 py-1 font-serif text-[16px] leading-relaxed text-ink ${isSpeaking ? "bg-listening-wash" : "hover:bg-paper"}`}
              >
                <span className="mr-2 font-sans text-[13px] font-semibold text-ink-soft">{roles.get(l.speaker) ?? l.speaker}</span>
                {isEvidence ? <Marked text={l.text} quote={evidence!.quote} /> : l.text}
              </p>
            );
          })}
        </div>
      ))}
    </article>
  );
}

function Marked({ text, quote }: { text: string; quote: string }) {
  const at = text.toLowerCase().indexOf(quote.toLowerCase());
  if (at === -1) return <mark className="rounded-sm bg-highlight px-0.5 text-ink">{text}</mark>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-highlight px-0.5 text-ink">{text.slice(at, at + quote.length)}</mark>
      {text.slice(at + quote.length)}
    </>
  );
}
