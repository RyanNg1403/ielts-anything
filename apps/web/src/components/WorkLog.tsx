import { useEffect, useState } from "react";
import { formatElapsed, type Step } from "../work.ts";

/** What the tutor is doing (live) or did (collapsed), shown under the learner's message. */
export function WorkLog({ steps, startedAt, endedAt }: { steps: Step[]; startedAt: number | null; endedAt: number | null }) {
  const live = endedAt === null;
  const [open, setOpen] = useState(live);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live]);
  // Collapse once the work is done; the learner can reopen it.
  useEffect(() => {
    if (!live) setOpen(false);
  }, [live]);

  const elapsed = startedAt ? formatElapsed((endedAt ?? now) - startedAt) : null;
  const current = [...steps].reverse().find((s) => s.status === "running") ?? steps[steps.length - 1];
  const shown = open ? steps : [];

  return (
    <div className="text-[14px]">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="group flex max-w-full items-center gap-2 text-ink-soft hover:text-ink">
        {live ? (
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
        ) : (
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
        )}
        <span className="truncate">
          {live ? (current && !open ? current.label : "Working") : "Worked"}
          {elapsed && <span className="text-ink-faint"> {live ? `· ${elapsed}` : `for ${elapsed}`}</span>}
        </span>
        <svg aria-hidden viewBox="0 0 16 16" className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M6 4l4 4-4 4" />
        </svg>
      </button>

      {shown.length > 0 && (
        <ol className="mt-3 space-y-2.5 pl-1">
          {shown.map((s) => (
            <li key={s.id} className="flex gap-3">
              <Dot status={s.status} />
              <div className="min-w-0 flex-1">
                <p className={s.status === "failed" ? "text-ink" : s.status === "running" ? "text-ink" : "text-ink-soft"}>{s.label}</p>
                {s.detail && (s.status !== "done" || s.kind !== "think" || open) && (
                  <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-[13px] leading-relaxed text-ink-faint">{s.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Dot({ status }: { status: Step["status"] }) {
  if (status === "running")
    return (
      <span className="mt-1.5 flex size-2 shrink-0">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
      </span>
    );
  return <span className={`mt-1.5 size-2 shrink-0 rounded-full ${status === "failed" ? "bg-writing" : "bg-rule-strong"}`} />;
}
