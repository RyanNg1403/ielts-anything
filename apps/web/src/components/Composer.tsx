import { useState, type KeyboardEvent } from "react";
import { SKILLS, encodeMessage, skillMeta, type Mode, type Skill } from "../skills.ts";

const tabColor: Record<Skill, string> = {
  reading: "var(--color-reading)",
  listening: "var(--color-listening)",
  writing: "var(--color-writing)",
  speaking: "var(--color-speaking)",
};

/** The home composer: an index card with one tab per IELTS skill. */
export function PracticeComposer({ onSubmit, disabled }: { onSubmit: (raw: string) => void; disabled?: boolean }) {
  const [skill, setSkill] = useState<Skill>("reading");
  const [mode, setMode] = useState<Mode>("full");
  const [text, setText] = useState("");
  const meta = skillMeta(skill);

  const submit = (value = text) => {
    if (!value.trim() || disabled) return;
    onSubmit(encodeMessage(value.trim(), skill, mode));
    setText("");
  };

  return (
    <div className="w-full">
      <div role="tablist" aria-label="IELTS skill" className="flex gap-1 overflow-x-auto pl-2 sm:pl-4 [scrollbar-width:none]">
        {SKILLS.map((s) => {
          const active = s.id === skill;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={active}
              onClick={() => setSkill(s.id)}
              className={`relative shrink-0 rounded-t-lg border border-b-0 px-3 pt-2 pb-2.5 text-sm sm:px-4 font-medium transition-colors ${
                active ? "z-10 -mb-px border-rule-strong bg-surface text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
              style={active ? { boxShadow: `inset 0 3px 0 ${tabColor[s.id]}` } : undefined}
            >
              <span className="mr-2 inline-block size-2 rounded-full align-middle" style={{ background: tabColor[s.id] }} />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-rule-strong bg-surface shadow-[0_1px_0_var(--color-rule),0_12px_32px_-18px_rgba(22,35,59,0.35)]">
        <div className="px-4 pt-5 sm:px-6">
          <label htmlFor="topic" className="font-serif text-xl font-semibold text-ink">
            {meta.prompt}
          </label>
          <textarea
            id="topic"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="A topic, a question, or paste a link or notes you want the test to be based on"
            className="mt-3 w-full resize-none bg-[repeating-linear-gradient(transparent,transparent_31px,var(--color-rule)_31px,var(--color-rule)_32px)] font-serif text-[17px] leading-8 text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-rule px-4 py-3 sm:px-6">
          <div role="radiogroup" aria-label="Practice length" className="flex rounded-lg bg-paper p-0.5 text-sm">
            {(["full", "drill"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 ${mode === m ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
              >
                {m === "full" ? "Full test" : "Drill"}
              </button>
            ))}
          </div>
          <span className="text-sm text-ink-soft">{mode === "full" ? meta.full : meta.drill}</span>
          <button
            onClick={() => submit()}
            disabled={!text.trim() || disabled}
            className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create practice
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 pl-1">
        <span className="py-1 text-sm text-ink-faint">Try</span>
        {meta.ideas.map((idea) => (
          <button
            key={idea}
            onClick={() => submit(idea)}
            disabled={disabled}
            className="rounded-full border border-rule bg-surface px-3 py-1 text-sm text-ink-soft hover:border-rule-strong hover:text-ink"
          >
            {idea}
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
    <div className="flex items-end gap-2 rounded-xl border border-rule-strong bg-surface p-2 shadow-[0_8px_24px_-18px_rgba(22,35,59,0.4)]">
      <textarea
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={busy ? "Codex is working…" : "Reply or ask for changes"}
        className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] focus:outline-none"
        aria-label="Message"
      />
      {busy ? (
        <button onClick={onStop} className="rounded-lg border border-rule-strong px-3 py-2 text-sm text-ink-soft hover:text-ink">
          Stop
        </button>
      ) : (
        <button
          onClick={send}
          disabled={!text.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          Send
        </button>
      )}
    </div>
  );
}
