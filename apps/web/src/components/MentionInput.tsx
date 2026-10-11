import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLibrary, type LibraryItem } from "../data.ts";

// Mentions are typed as "@" + search, shown as "@Title" while editing, and sent as
// "@[Title](test:<id>)" so the tutor knows exactly which test is meant.
export const MENTION = /@\[([^\]]+)\]\(test:([0-9a-f-]{36})\)/g;

export type MentionInputHandle = { focus: () => void };

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
  ariaLabel: string;
  /** Where the picker opens: below the box (home) or above it (reply box at the bottom). */
  pickerBelow?: boolean;
};

/** Textarea with an "@" picker for tests. `value` holds the serialized form. */
export const MentionInput = forwardRef<MentionInputHandle, Props>(function MentionInput(
  { value, onChange, onSubmit, placeholder, rows = 1, className = "", autoFocus, ariaLabel, pickerBelow },
  ref,
) {
  const area = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => area.current?.focus() }));
  const { data: tests = [] } = useLibrary();
  const [query, setQuery] = useState<{ start: number; text: string } | null>(null);
  const [active, setActive] = useState(0);
  const caret = useRef<number | null>(null);

  // The textarea shows "@Title"; the stored value keeps the id.
  const display = value.replace(MENTION, "@$1");
  const toStored = (shown: string) => {
    let out = shown;
    for (const [, title, id] of value.matchAll(MENTION)) if (out.includes(`@${title}`)) out = out.replace(`@${title}`, `@[${title}](test:${id})`);
    return out;
  };

  const matches = useMemo(() => {
    if (!query) return [];
    const q = query.text.toLowerCase();
    return tests.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 6);
  }, [query, tests]);

  const detect = (el: HTMLTextAreaElement) => {
    const before = el.value.slice(0, el.selectionStart);
    const m = before.match(/(^|\s)@([^@\n]{0,40})$/);
    setQuery(m ? { start: before.length - m[2]!.length - 1, text: m[2]! } : null);
    setActive(0);
  };

  const pick = (t: LibraryItem) => {
    if (!query || !area.current) return;
    const el = area.current;
    const shown = el.value;
    const end = query.start + 1 + query.text.length;
    const next = `${shown.slice(0, query.start)}@${t.title} ${shown.slice(end)}`;
    const stored = toStored(next).replace(`@${t.title} `, `@[${t.title}](test:${t.id}) `);
    caret.current = query.start + t.title.length + 2;
    onChange(stored);
    setQuery(null);
  };

  // Place the caret after an inserted mention in the same frame the text changes.
  useLayoutEffect(() => {
    if (caret.current === null || !area.current) return;
    area.current.focus();
    area.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [display]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (query && matches.length) {
      if (e.key === "ArrowDown") return e.preventDefault(), setActive((a) => (a + 1) % matches.length);
      if (e.key === "ArrowUp") return e.preventDefault(), setActive((a) => (a - 1 + matches.length) % matches.length);
      if (e.key === "Enter" || e.key === "Tab") return e.preventDefault(), pick(matches[active]!);
      if (e.key === "Escape") return setQuery(null);
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={area}
        rows={rows}
        value={display}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(toStored(e.target.value));
          detect(e.target);
        }}
        onKeyDown={onKeyDown}
        onClick={(e) => detect(e.currentTarget)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        className={className}
      />
      {query && (
        <div role="listbox" aria-label="Tests" className={`absolute left-0 z-20 w-full max-w-md ${pickerBelow ? "top-full mt-2" : "bottom-full mb-2"} overflow-hidden rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)] py-1.5 shadow-xl`}>
          {matches.length === 0 ? (
            <p className="px-4 py-2 text-sm text-ink-faint">{tests.length ? "No test with that name" : "Tests you create will show up here"}</p>
          ) : (
            matches.map((t, i) => (
              <button
                key={t.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(t)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${i === active ? "bg-paper" : ""}`}
              >
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: `var(--color-${t.kind})` }} />
                <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
                <span className="shrink-0 text-[12px] text-ink-soft">
                  {t.status === "scored" ? (t.band != null ? t.band.toFixed(1) : `${t.raw}/${t.total}`) : t.status === "in_progress" ? "In progress" : "Not taken"}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
});

/** Render a message with mentions as quiet inline chips. */
export function MentionText({ text }: { text: string }) {
  const parts: (string | { title: string; id: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION)) {
    parts.push(text.slice(last, m.index));
    parts.push({ title: m[1]!, id: m[2]! });
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          p
        ) : (
          <a key={i} href={`#/test/${p.id}`} className="rounded bg-surface/70 px-1 font-medium text-accent hover:underline">
            @{p.title}
          </a>
        ),
      )}
    </>
  );
}
