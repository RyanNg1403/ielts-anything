import type { Conversation } from "../api.ts";
import { SKILLS } from "../skills.ts";

export type View = "practice" | "sources" | "settings";

export function Sidebar({
  conversations,
  activeId,
  view,
  onNew,
  onOpen,
  onView,
}: {
  conversations: Conversation[];
  activeId: string | null;
  view: View;
  onNew: () => void;
  onOpen: (id: string) => void;
  onView: (v: View) => void;
}) {
  const groups = SKILLS.map((s) => ({ ...s, items: conversations.filter((c) => c.skill === s.id) })).filter((g) => g.items.length);
  const ungrouped = conversations.filter((c) => !c.skill);

  return (
    <nav aria-label="Main" className="flex h-full w-[264px] shrink-0 flex-col border-r border-rule bg-[#eef2f7]">
      <div className="px-5 pt-5 pb-4">
        <p className="font-serif text-[19px] font-semibold tracking-tight text-ink">IELTS Anything</p>
        <p className="text-[13px] text-ink-soft">Cambridge-format practice on any topic</p>
      </div>

      <div className="px-3">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-4">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          New practice
        </button>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-3">
        <p className="px-2 pb-1.5 text-[13px] font-medium text-ink-soft">Library</p>
        {conversations.length === 0 && <p className="px-2 text-[13px] leading-snug text-ink-faint">Your tests and drills will appear here.</p>}
        {groups.map((g) => (
          <div key={g.id} className="mb-3">
            <p className="flex items-center gap-1.5 px-2 py-1 text-[12px] text-ink-faint">
              <span className="size-1.5 rounded-full" style={{ background: `var(--color-${g.id})` }} />
              {g.label}
            </p>
            {g.items.map((c) => (
              <Item key={c.id} c={c} active={c.id === activeId && view === "practice"} onOpen={onOpen} />
            ))}
          </div>
        ))}
        {ungrouped.map((c) => (
          <Item key={c.id} c={c} active={c.id === activeId && view === "practice"} onOpen={onOpen} />
        ))}
      </div>

      <div className="border-t border-rule px-3 py-3">
        {(["sources", "settings"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            aria-current={view === v ? "page" : undefined}
            className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${view === v ? "bg-surface text-ink" : "text-ink-soft hover:text-ink"}`}
          >
            {v === "sources" ? "Sources" : "Settings"}
          </button>
        ))}
      </div>
    </nav>
  );
}

function Item({ c, active, onOpen }: { c: Conversation; active: boolean; onOpen: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpen(c.id)}
      aria-current={active ? "page" : undefined}
      className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-sm ${active ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:bg-white/60 hover:text-ink"}`}
    >
      {c.title}
    </button>
  );
}
