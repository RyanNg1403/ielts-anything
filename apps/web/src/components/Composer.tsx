import { useState } from "react";
import { MentionInput } from "./MentionInput.tsx";
import { ModelPicker } from "./ModelPicker.tsx";
import type { Caption } from "../api.ts";
import type { useVoice } from "../voice.ts";

const IDEAS: { skill: "reading" | "listening" | "writing" | "speaking"; text: string }[] = [
  { skill: "reading", text: "A full Reading test on the science of sleep" },
  { skill: "listening", text: "A Listening Part 1 drill: booking a climbing course" },
  { skill: "writing", text: "Writing Task 2 on AI in schools" },
  { skill: "speaking", text: "A Speaking mock test about travel" },
];

/** The home composer: one box. The tutor works out the skill and length from what you write. */
export function PracticeComposer({ onSubmit, onVoice, disabled }: { onSubmit: (raw: string) => void; onVoice: () => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const submit = (value = text) => {
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
    setText("");
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-rule bg-surface shadow-[var(--shadow-float)] transition-colors focus-within:border-rule-strong">
        <MentionInput
          rows={3}
          value={text}
          autoFocus
          onChange={setText}
          onSubmit={() => submit()}
          ariaLabel="What do you want to practise?"
          pickerBelow
          placeholder="A test on any topic, or type @ to talk about a test you've taken"
          className="block w-full resize-none rounded-t-2xl bg-transparent px-5 pt-4 text-[16px] leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <ModelPicker />
          {text.trim() ? <SendButton onClick={() => submit()} disabled={disabled} label="Start" /> : <MicButton onClick={onVoice} disabled={disabled} />}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {IDEAS.map((idea) => (
          <button
            key={idea.text}
            onClick={() => submit(idea.text)}
            disabled={disabled}
            className="rounded-lg border border-rule px-3 py-1.5 text-[13.5px] text-ink-soft transition-colors hover:border-rule-strong hover:bg-surface hover:text-ink"
          >
            {idea.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The reply box inside a conversation. While talking with the tutor it becomes the voice bar. */
export function ReplyBox({
  onSend,
  onStop,
  busy,
  voice,
  caption,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
  voice: ReturnType<typeof useVoice>;
  caption: Caption;
}) {
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim() || busy) return;
    onSend(text.trim());
    setText("");
  };
  if (voice.state === "connecting" || voice.state === "live") return <VoiceBar voice={voice} caption={caption} />;
  return (
    <div className="rounded-2xl border border-rule bg-surface shadow-[var(--shadow-float)] focus-within:border-rule-strong">
      <MentionInput
        value={text}
        onChange={setText}
        onSubmit={send}
        ariaLabel="Message"
        placeholder={busy ? "Working on it…" : "Reply, or type @ to bring in a test"}
        className="block max-h-40 min-h-11 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[15px] focus:outline-none"
      />
      {voice.error && (
        <p role="alert" className="flex items-center gap-2 px-4 pb-1 text-[13px] text-danger">
          {voice.error}
          <button onClick={voice.dismissError} className="text-ink-soft underline-offset-2 hover:underline">
            Dismiss
          </button>
        </p>
      )}
      <div className="flex items-center justify-between px-2 pb-2">
        <ModelPicker />
        {busy ? (
          <button onClick={onStop} aria-label="Stop" title="Stop" className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary hover:bg-primary-hover">
            <span className="size-2.5 rounded-[2px] bg-current" />
          </button>
        ) : text.trim() ? (
          <SendButton onClick={send} label="Send" />
        ) : (
          <MicButton onClick={voice.start} />
        )}
      </div>
    </div>
  );
}

/** A live voice conversation: an orb that moves with whoever is speaking, the words as they are said, mute and end. */
function VoiceBar({ voice, caption }: { voice: ReturnType<typeof useVoice>; caption: Caption }) {
  const live = voice.state === "live";
  const tutor = voice.level.tutor > 0.04;
  const loud = Math.max(voice.level.tutor, voice.muted ? 0 : voice.level.me);
  const line = voice.askingMic
    ? "Allow the microphone in your browser"
    : !live
      ? "Connecting…"
    : caption?.text.trim()
      ? caption.text
      : voice.muted
        ? "Muted"
        : tutor
          ? "Speaking…"
          : "Listening";
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-rule bg-surface py-3 pr-3 pl-4 shadow-[var(--shadow-float)]" aria-live="polite">
      <span className="relative flex size-10 shrink-0 items-center justify-center">
        <span
          aria-hidden
          className={`absolute inset-0 rounded-full transition-transform duration-100 ${tutor ? "bg-accent/20" : "bg-ink/10"}`}
          style={{ transform: `scale(${1 + loud * 0.6})` }}
        />
        <span className={`relative size-6 rounded-full ${live ? (tutor ? "bg-accent" : "bg-ink") : "animate-pulse bg-ink-faint"}`} />
      </span>
      <p className={`line-clamp-2 min-w-0 flex-1 text-[15px] leading-snug ${caption?.role === "user" ? "text-ink-soft" : "text-ink"}`}>{line}</p>
      <button
        onClick={voice.toggleMute}
        disabled={!live}
        aria-label={voice.muted ? "Unmute" : "Mute"}
        aria-pressed={voice.muted}
        title={voice.muted ? "Unmute" : "Mute"}
        className={`flex size-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${voice.muted ? "bg-selected text-ink" : "text-ink-soft hover:bg-selected hover:text-ink"}`}
      >
        <MicIcon off={voice.muted} />
      </button>
      <button onClick={voice.stop} className="h-9 rounded-lg bg-primary px-3.5 text-[14px] font-medium text-on-primary hover:bg-primary-hover">
        End
      </button>
    </div>
  );
}

function SendButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-25"
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
      </svg>
    </button>
  );
}

function MicButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Talk with the tutor"
      title="Talk with the tutor"
      className="flex size-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-selected hover:text-ink disabled:opacity-40"
    >
      <MicIcon />
    </button>
  );
}

function MicIcon({ off }: { off?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5.75" y="1.75" width="4.5" height="8" rx="2.25" />
      <path d="M3.25 7.5a4.75 4.75 0 0 0 9.5 0M8 12.25v2" />
      {off && <path d="m2.5 2.5 11 11" />}
    </svg>
  );
}
