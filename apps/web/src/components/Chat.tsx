import { useEffect, useRef } from "react";
import { useConversation } from "../api.ts";
import { skillMeta, type Skill } from "../skills.ts";
import { AskCard } from "./cards/AskCard.tsx";
import { BriefCard } from "./cards/BriefCard.tsx";
import { ReplyBox } from "./Composer.tsx";
import { Markdown } from "./Markdown.tsx";

export function Chat({ conversationId, initial }: { conversationId: string; initial: { current: string | null } }) {
  const { entries, busy, activity, send, answer, interrupt } = useConversation(conversationId, initial);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length, activity]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] space-y-6 px-4 py-10 sm:px-6">
          {entries.map((e) => {
            switch (e.kind) {
              case "user":
                return (
                  <div key={e.id} className="flex flex-col items-end gap-1.5">
                    {e.skill && (
                      <span className="text-[13px] text-ink-soft">
                        <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: `var(--color-${e.skill})` }} />
                        {skillMeta(e.skill as Skill).label} · {e.mode === "drill" ? "Drill" : "Full test"}
                      </span>
                    )}
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-white">{e.text}</p>
                  </div>
                );
              case "agent":
                return <Markdown key={e.id} text={e.text} />;
              case "ask":
                return (
                  <AskCard
                    key={e.id}
                    questions={e.questions}
                    answers={e.answers}
                    onSubmit={e.askId ? (a) => answer(e.askId!, a) : undefined}
                  />
                );
              case "card":
                return <BriefCard key={e.id} card={e.card} />;
              case "error":
                return (
                  <p key={e.id} role="alert" className="rounded-lg border border-[#f3c7c2] bg-[#fdf1ef] px-4 py-3 text-sm text-danger">
                    {e.message}
                  </p>
                );
            }
          })}
          {activity && (
            <p className="flex items-center gap-2 text-sm text-ink-soft" aria-live="polite">
              <span className="inline-flex gap-1">
                <span className="size-1.5 animate-pulse rounded-full bg-ink-faint" />
                <span className="size-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:300ms]" />
              </span>
              {activity.label}
            </p>
          )}
          <div ref={end} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[720px] px-4 pb-5 sm:px-6">
        <ReplyBox onSend={(t) => send(t)} onStop={interrupt} busy={busy} />
      </div>
    </div>
  );
}
