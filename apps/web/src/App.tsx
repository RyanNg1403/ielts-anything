import { useCallback, useEffect, useRef, useState } from "react";
import { createConversation, listConversations, type Conversation } from "./api.ts";
import { Chat } from "./components/Chat.tsx";
import { PracticeComposer } from "./components/Composer.tsx";
import { Sidebar, type View } from "./components/Sidebar.tsx";

export function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("practice");
  const [creating, setCreating] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const firstMessage = useRef<string | null>(null);

  const refresh = useCallback(() => listConversations().then(setConversations).catch(() => {}), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const start = async (raw: string) => {
    setCreating(true);
    try {
      const id = await createConversation();
      firstMessage.current = raw;
      setActiveId(id);
      setView("practice");
      setTimeout(refresh, 500);
    } finally {
      setCreating(false);
    }
  };

  const open = (id: string) => {
    firstMessage.current = null;
    setActiveId(id);
    setView("practice");
  };

  return (
    <div className="flex h-full">
      {drawer && <div className="fixed inset-0 z-30 bg-ink/30 md:hidden" onClick={() => setDrawer(false)} aria-hidden />}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform md:static md:translate-x-0 ${drawer ? "translate-x-0" : "-translate-x-full"}`}
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("button")) setDrawer(false);
        }}
      >
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        view={view}
        onNew={() => {
          firstMessage.current = null;
          setActiveId(null);
          setView("practice");
        }}
        onOpen={open}
        onView={setView}
      />
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-rule px-4 py-3 md:hidden">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-md p-1.5 text-ink-soft hover:text-ink">
            <svg aria-hidden viewBox="0 0 20 20" className="size-5">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-serif text-[17px] font-semibold">IELTS Anything</span>
        </header>
        <div className="min-h-0 flex-1">
        {view === "practice" && activeId && <Chat key={activeId} conversationId={activeId} initial={firstMessage} />}
        {view === "practice" && !activeId && (
          <div className="flex h-full items-center justify-center overflow-y-auto px-4 sm:px-8">
            <div className="w-full max-w-[680px] py-12">
              <h1 className="font-serif text-[28px] sm:text-[34px] font-semibold leading-tight tracking-tight text-ink">
                Practise IELTS on something you actually care about.
              </h1>
              <p className="mt-3 max-w-[56ch] text-[16px] text-ink-soft">
                Pick a skill, give it a topic, and get a test in the format of the Cambridge IELTS books, marked to the band.
              </p>
              <div className="mt-9">
                <PracticeComposer onSubmit={start} disabled={creating} />
              </div>
            </div>
          </div>
        )}
        {view !== "practice" && (
          <div className="mx-auto max-w-[680px] px-6 py-12">
            <h1 className="font-serif text-2xl font-semibold">{view === "sources" ? "Sources" : "Settings"}</h1>
            <p className="mt-2 text-ink-soft">Coming in a later milestone.</p>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
