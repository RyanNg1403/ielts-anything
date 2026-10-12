import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Conversation } from "../api.ts";
import { deleteConversation, renameConversation, useLibrary, useResource } from "../data.ts";
import { go, type Route } from "../router.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";

export type ConversationRow = Conversation;

export const useConversations = () => useResource<ConversationRow[]>("/api/conversations");

const Icon = {
  plus: <path d="M8 3v10M3 8h10" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10.2 10.2 13.5 13.5" />
    </>
  ),
  tests: (
    <>
      <rect x="3" y="2.5" width="10" height="11" rx="1.5" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
    </>
  ),
  progress: <path d="M2.5 13.5h11M4.5 11V8M8 11V5M11.5 11V3" />,
  settings: (
    <>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.75v1.5M8 12.75v1.5M14.25 8h-1.5M3.25 8h-1.5M12.4 3.6l-1.06 1.06M4.66 11.34 3.6 12.4M12.4 12.4l-1.06-1.06M4.66 4.66 3.6 3.6" />
    </>
  ),
};

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function Sidebar({ route, onSearch, width, onCollapse }: { route: Route; onSearch: () => void; width: number; onCollapse: () => void }) {
  const { data: conversations = [] } = useConversations();
  const { data: tests = [] } = useLibrary();
  const toTake = tests.filter((t) => t.status !== "scored").length;
  const activeChat = route.name === "chat" ? route.id : null;

  const nav = (target: Route, icon: ReactNode, label: string, extra?: ReactNode) => {
    const active = route.name === target.name;
    return (
      <button
        onClick={() => go(target)}
        aria-current={active ? "page" : undefined}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[14px] ${active ? "bg-selected text-ink" : "text-ink-soft hover:bg-selected hover:text-ink"}`}
      >
        <Svg>{icon}</Svg>
        <span className="flex-1">{label}</span>
        {extra}
      </button>
    );
  };

  return (
    <nav aria-label="Main" style={{ width }} className="flex h-full shrink-0 flex-col border-r border-rule/70 bg-sidebar">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => go({ name: "home" })} className="flex min-w-0 items-center gap-2.5 font-serif text-[20px] font-medium tracking-tight text-ink">
          <img src="/branding/emblem-ielts-four-skills.svg" alt="" aria-hidden="true" className="size-7 shrink-0" />
          <span className="truncate">IELTS Anything</span>
        </button>
        <SidebarToggle onClick={onCollapse} label="Hide sidebar (⌘B)" />
      </div>

      <div className="space-y-0.5 px-2">
        <button
          onClick={() => go({ name: "home" })}
          className="group mb-1 flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[14px] font-medium text-ink hover:bg-selected"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-on-primary transition-transform group-hover:scale-105">
            <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M8 3.5v9M3.5 8h9" />
            </svg>
          </span>
          New practice
        </button>
        <button onClick={onSearch} className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[14px] text-ink-soft hover:bg-selected hover:text-ink">
          <Svg>{Icon.search}</Svg>
          <span className="flex-1">Search</span>
          <kbd className="font-sans text-[12px] text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">⌘K</kbd>
        </button>
        {nav({ name: "tests" }, Icon.tests, "Tests", toTake > 0 ? <span className="text-[12px] tabular-nums text-ink-faint">{toTake}</span> : null)}
        {nav({ name: "progress" }, Icon.progress, "Progress")}
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-2">
        <p className="px-2.5 pb-1.5 text-[12px] text-ink-faint">Recents</p>
        {conversations.length === 0 && <p className="px-2.5 text-[13px] text-ink-faint">Your chats appear here.</p>}
        {conversations.map((c) => (
          <ChatRow key={c.id} c={c} active={c.id === activeChat} />
        ))}
      </div>

      <div className="p-2">{nav({ name: "settings" }, Icon.settings, "Settings")}</div>
    </nav>
  );
}

export function SidebarToggle({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="rounded-md p-1.5 text-ink-faint hover:bg-selected hover:text-ink">
      <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="2" y="2.75" width="12" height="10.5" rx="2" />
        <path d="M6 2.75v10.5" />
      </svg>
    </button>
  );
}

function ChatRow({ c, active }: { c: ConversationRow; active: boolean }) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState(c.title);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  const save = async () => {
    setEditing(false);
    if (title.trim() && title.trim() !== c.title) await renameConversation(c.id, title.trim());
    else setTitle(c.title);
  };

  if (editing)
    return (
      <input
        ref={input}
        value={title}
        aria-label="Chat name"
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setTitle(c.title);
            setEditing(false);
          }
        }}
        className="w-full rounded-lg border border-rule-strong bg-surface px-2.5 py-1.5 text-[14px] text-ink focus:outline-none"
      />
    );

  return (
    <div ref={root} className="group relative">
      <button
        onClick={() => go({ name: "chat", id: c.id })}
        aria-current={active ? "page" : undefined}
        className={`flex w-full items-center gap-2 rounded-lg py-1.5 pr-8 pl-2.5 text-left text-[14px] ${active ? "bg-selected text-ink" : "text-ink-soft hover:bg-selected hover:text-ink"}`}
      >
        <span className="min-w-0 flex-1 truncate">{c.title}</span>
      </button>
      <button
        onClick={() => setMenu((m) => !m)}
        aria-label={`Options for ${c.title}`}
        aria-expanded={menu}
        className={`absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1 text-ink-faint hover:text-ink ${menu ? "visible" : "invisible group-hover:visible"}`}
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="currentColor">
          <circle cx="3.5" cy="8" r="1.2" />
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="12.5" cy="8" r="1.2" />
        </svg>
      </button>
      {menu && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-1 w-40 overflow-hidden rounded-xl border border-rule bg-surface py-1 shadow-[var(--shadow-float)]">
          <button role="menuitem" onClick={() => (setMenu(false), setEditing(true))} className="block w-full px-3 py-1.5 text-left text-[14px] text-ink hover:bg-selected">
            Rename
          </button>
          <button role="menuitem" onClick={() => (setMenu(false), setConfirming(true))} className="block w-full px-3 py-1.5 text-left text-[14px] text-danger hover:bg-selected">
            Delete
          </button>
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title="Delete this chat?"
          action="Delete"
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            setConfirming(false);
            await deleteConversation(c.id);
            if (active) go({ name: "home" });
          }}
        >
          “{c.title}” will be removed. Tests made in it stay in Tests.
        </ConfirmDialog>
      )}
    </div>
  );
}
