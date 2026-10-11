import { useEffect, useMemo, useRef, useState } from "react";
import { useLibrary } from "../data.ts";
import { go, type Route } from "../router.ts";
import { useConversations } from "./Sidebar.tsx";

type Result = { key: string; group: "Chats" | "Tests"; title: string; meta: string; route: Route; skill: string | null };

export function SearchPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const { data: chats = [] } = useConversations();
  const { data: tests = [] } = useLibrary();

  useEffect(() => input.current?.focus(), []);

  const results = useMemo<Result[]>(() => {
    const needle = q.trim().toLowerCase();
    const match = (s: string) => !needle || s.toLowerCase().includes(needle);
    const t: Result[] = tests
      .filter((x) => match(x.title))
      .map((x) => ({
        key: `t-${x.id}`,
        group: "Tests",
        title: x.title,
        meta: x.status === "scored" ? (x.band != null ? `Band ${x.band.toFixed(1)}` : `${x.raw}/${x.total}`) : x.status === "in_progress" ? "In progress" : "Not started",
        route: { name: "test", id: x.id, review: false, q: null, part: null },
        skill: x.kind,
      }));
    const c: Result[] = chats
      .filter((x) => match(x.title))
      .map((x) => ({ key: `c-${x.id}`, group: "Chats", title: x.title, meta: x.score ?? "", route: { name: "chat", id: x.id }, skill: x.skill }));
    return [...c, ...t].slice(0, 30);
  }, [q, chats, tests]);

  const open = (r: Result | undefined) => {
    if (!r) return;
    go(r.route);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-scrim px-4 pt-[12vh]" onClick={onClose}>
      <div role="dialog" aria-label="Search" className="w-full max-w-xl overflow-hidden rounded-xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Enter") open(results[active]);
          }}
          placeholder="Search chats and tests"
          className="w-full border-b border-rule px-5 py-4 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <ul className="max-h-[50vh] overflow-y-auto py-2" role="listbox">
          {results.length === 0 && <li className="px-5 py-6 text-center text-sm text-ink-faint">Nothing matches “{q}”.</li>}
          {results.map((r, i) => (
            <li key={r.key} role="option" aria-selected={i === active}>
              {(i === 0 || results[i - 1]!.group !== r.group) && <p className="px-5 pt-2 pb-1 text-[12px] font-medium text-ink-faint">{r.group}</p>}
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => open(r)}
                className={`flex w-full items-center gap-3 px-5 py-2 text-left text-sm ${i === active ? "bg-paper" : ""}`}
              >
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: r.skill ? `var(--color-${r.skill})` : "var(--color-rule-strong)" }} />
                <span className="min-w-0 flex-1 truncate text-ink">{r.title}</span>
                <span className="shrink-0 text-[12px] text-ink-soft">{r.meta}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
