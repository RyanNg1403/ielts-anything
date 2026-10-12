import { useEffect, useMemo, useRef } from "react";
import { useConversation } from "../api.ts";
import { AskCard } from "./cards/AskCard.tsx";
import { BriefCard } from "./cards/BriefCard.tsx";
import { ConfirmDeleteCard } from "./cards/ConfirmDeleteCard.tsx";
import { ChatActions, ExplainCard, ScoreCard, TestCard } from "./cards/TestCards.tsx";
import { ReplyBox } from "./Composer.tsx";
import { Markdown } from "./Markdown.tsx";
import { WorkLog } from "./WorkLog.tsx";
import { MentionText } from "./MentionInput.tsx";
import { useVoice } from "../voice.ts";

export function Chat({ conversationId, initial }: { conversationId: string; initial: { current: string | null } }) {
  const { entries, busy, activity, caption, voiceEnded, send, answer, confirmDelete, interrupt, answerLate } = useConversation(conversationId, initial);
  const voice = useVoice(conversationId);
  const end = useRef<HTMLDivElement>(null);

  // The mic on the home screen opens a new chat and starts talking straight away.
  useEffect(() => {
    const key = `voice:${conversationId}`;
    if (sessionStorage.getItem(key)) {
      sessionStorage.removeItem(key);
      voice.start();
    }
  }, [conversationId, voice.start]);

  // Codex closed the voice session (timeout, error): hang up here too.
  useEffect(() => {
    if (voiceEnded) voice.stop();
  }, [voiceEnded, voice.stop]);

  // "Ask the tutor" buttons elsewhere leave a message to send when this chat opens.
  useEffect(() => {
    const key = `draft:${conversationId}`;
    const draft = sessionStorage.getItem(key);
    if (draft) {
      sessionStorage.removeItem(key);
      send(draft);
    }
  }, [conversationId, send]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length, activity]);

  // The brief is a placeholder for the test; once the test card exists, the brief is redundant.
  const lastTest = entries.findLastIndex((e) => e.kind === "card" && e.card.kind === "test");

  const actions = useMemo(() => ({ send: (t: string) => send(t), busy }), [send, busy]);

  return (
    <ChatActions.Provider value={actions}>
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[740px] space-y-7 px-4 pt-12 pb-8 sm:px-6">
            {entries.map((e, index) => {
              switch (e.kind) {
                case "user":
                  return (
                    <div key={e.id} className="flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-bubble px-4 py-2.5 text-[15.5px] leading-relaxed text-ink">
                        <MentionText text={e.text} />
                      </p>
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
                      // If nobody is waiting on this card any more (e.g. the app restarted), the
                      // answers still land in the card and reach the tutor as the next message.
                      onSubmit={e.askId ? (a) => answer(e.askId!, a) : (a) => answerLate(e.id, a, answersAsText(e.questions, a))}
                    />
                  );
                case "confirm":
                  return (
                    <ConfirmDeleteCard key={e.id} tests={e.tests} outcome={e.outcome} onAnswer={(yes) => confirmDelete(e.requestId, yes)} />
                  );
                case "card":
                  switch (e.card.kind) {
                    case "brief":
                      return index < lastTest ? null : <BriefCard key={e.id} card={e.card} />;
                    case "test":
                      return <TestCard key={e.id} testId={e.card.testId} />;
                    case "score":
                      return <ScoreCard key={e.id} testId={e.card.testId} />;
                    case "explain":
                      return <ExplainCard key={e.id} testId={e.card.testId} items={e.card.items} />;
                  }
                  return null;
                case "work":
                  return <WorkLog key={e.id} steps={e.steps} startedAt={e.startedAt} endedAt={e.endedAt} />;
                case "error":
                  return (
                    <p key={e.id} role="alert" className="rounded-lg border border-alert-line bg-alert-wash px-4 py-3 text-sm text-danger">
                      {e.message}
                    </p>
                  );
              }
            })}
            {activity && !entries.some((x) => x.kind === "work" && x.endedAt === null) && (
              <p className="flex items-center gap-2.5 text-[14px] text-ink-soft" aria-live="polite">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                {activity.label}
              </p>
            )}
            <div ref={end} />
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[740px] px-4 pb-5 sm:px-6">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-paper to-transparent" />
          <ReplyBox onSend={(t) => send(t)} onStop={interrupt} busy={busy} voice={voice} caption={caption} />
        </div>
      </div>
    </ChatActions.Provider>
  );
}

function answersAsText(questions: { id: string; header: string }[], answers: Record<string, string[]>) {
  return questions.map((q) => `${q.header}: ${(answers[q.id] ?? []).join(", ")}`).join("\n");
}
