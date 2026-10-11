import { useState } from "react";
import { MentionInput } from "./MentionInput.tsx";

const IDEAS: { skill: "reading" | "listening" | "writing" | "speaking"; text: string }[] = [
  { skill: "reading", text: "A full Reading test on the science of sleep" },
  { skill: "listening", text: "A Listening Part 1 drill: booking a climbing course" },
  { skill: "writing", text: "Writing Task 2 on AI in schools" },
  { skill: "speaking", text: "A Speaking mock test about travel" },
];

/** The home composer: one box. The tutor works out the skill and length from what you write. */
export function PracticeComposer({ onSubmit, disabled }: { onSubmit: (raw: string) => void; disabled?: boolean }) {
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
        <div className="flex justify-end px-3 pb-3">
          <button
            onClick={() => submit()}
            disabled={!text.trim() || disabled}
            aria-label="Start"
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary transition-opacity hover:bg-primary-hover disabled:opacity-25"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
            </svg>
          </button>
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

/** The reply box inside a conversation. */
export function ReplyBox({
  onSend,
  onStop,
  busy,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim() || busy) return;
    onSend(text.trim());
    setText("");
  };
  return (
    <div className="flex items-end gap-2 rounded-2xl border border-rule bg-surface p-2 pl-3 shadow-[var(--shadow-float)] focus-within:border-rule-strong">
      <div className="flex-1">
        <MentionInput
          value={text}
          onChange={setText}
          onSubmit={send}
          ariaLabel="Message"
          placeholder={busy ? "Working on it…" : "Reply, or type @ to bring in a test"}
          className="block max-h-40 min-h-10 w-full resize-none bg-transparent px-2 py-2 text-[15px] focus:outline-none"
        />
      </div>
      {busy ? (
        <button onClick={onStop} aria-label="Stop" title="Stop" className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary hover:bg-primary-hover">
          <span className="size-2.5 rounded-[2px] bg-current" />
        </button>
      ) : (
        <button
          onClick={send}
          disabled={!text.trim()}
          aria-label="Send"
          className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-25"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
