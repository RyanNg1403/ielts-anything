import { useEffect, useRef, useState } from "react";
import { EFFORT_LABELS, setAgentSettings, useAgentSettings, useModels } from "../agent.ts";

/** Quiet "Model · Effort" control in the composer; opens a small menu above it. */
export function ModelPicker() {
  const { data } = useModels();
  const models = data?.models;
  const settings = useAgentSettings();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!models?.length) return null;
  const model = models.find((m) => m.id === settings.model) ?? models.find((m) => m.isDefault) ?? models[0]!;
  const wanted = settings.effort ?? data!.defaultEffort;
  const effort = model.efforts.includes(wanted) ? wanted : model.efforts.includes("medium") ? "medium" : model.efforts[0]!;
  const fast = settings.fast && !!model.fast;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] text-ink-soft transition-colors hover:bg-selected hover:text-ink"
      >
        {fast && <Bolt />}
        <span>{model.name}</span>
        <span className="text-ink-faint">{EFFORT_LABELS[effort] ?? effort}</span>
        <svg aria-hidden viewBox="0 0 16 16" className="size-3 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div role="dialog" aria-label="Model" className="absolute bottom-full left-0 z-30 mb-2 w-[300px] rounded-xl border border-rule bg-surface p-1.5 shadow-[var(--shadow-float)]">
          <ul role="radiogroup" aria-label="Model" className="max-h-64 overflow-y-auto">
            {models.map((m) => (
              <li key={m.id}>
                <button
                  role="radio"
                  aria-checked={m.id === model.id}
                  onClick={() => setAgentSettings({ model: m.id, ...(m.efforts.includes(effort) ? {} : { effort: m.efforts.includes("medium") ? "medium" : m.efforts[0] }) })}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-selected"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-ink">{m.name}</span>
                    {m.description && <span className="block truncate text-[12px] text-ink-faint">{m.description}</span>}
                  </span>
                  {m.id === model.id && <Check />}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-1.5 border-t border-rule px-2.5 pt-2.5 pb-1">
            <p className="text-[12px] text-ink-faint">Thinking</p>
            <div role="radiogroup" aria-label="Thinking effort" className="mt-1.5 flex flex-wrap gap-1">
              {model.efforts.map((e) => (
                <button
                  key={e}
                  role="radio"
                  aria-checked={e === effort}
                  onClick={() => setAgentSettings({ effort: e })}
                  className={`rounded-md px-2 py-1 text-[12.5px] transition-colors ${e === effort ? "bg-selected text-ink" : "text-ink-soft hover:bg-selected hover:text-ink"}`}
                >
                  {EFFORT_LABELS[e] ?? e}
                </button>
              ))}
            </div>
          </div>

          {model.fast && (
            <label className="mt-1.5 flex cursor-pointer items-center gap-3 border-t border-rule px-2.5 pt-2.5 pb-1.5">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] text-ink">Fast</span>
                <span className="block text-[12px] text-ink-faint">{model.fast}</span>
              </span>
              <input type="checkbox" className="peer sr-only" checked={fast} onChange={(e) => setAgentSettings({ fast: e.target.checked })} />
              <span aria-hidden className="relative h-5 w-9 rounded-full bg-rule-strong transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-surface after:transition-transform peer-checked:after:translate-x-4" />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

const Bolt = () => (
  <svg aria-label="Fast" viewBox="0 0 16 16" className="size-3.5 text-ink" fill="currentColor">
    <path d="M9.2 1.5 3.5 9h3.8l-.9 5.5L12.5 7H8.6l.6-5.5Z" />
  </svg>
);

const Check = () => (
  <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3.5 8.5 3 3 6-7" />
  </svg>
);
