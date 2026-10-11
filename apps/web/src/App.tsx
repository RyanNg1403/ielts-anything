import { useEffect, useRef, useState } from "react";
import { createConversation } from "./api.ts";
import { Chat } from "./components/Chat.tsx";
import { PracticeComposer } from "./components/Composer.tsx";
import { SearchPalette } from "./components/SearchPalette.tsx";
import { Sidebar, SidebarToggle } from "./components/Sidebar.tsx";
import { ProgressPage } from "./pages/ProgressPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { TestsPage } from "./pages/TestsPage.tsx";
import { go, useRoute } from "./router.ts";
import { TestScreen } from "./test/TestScreen.tsx";
import { useTheme } from "./theme.ts";

export function App() {
  const route = useRoute();
  useTheme(); // keeps "system" in sync with the OS
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [creating, setCreating] = useState(false);
  // The first message of a chat created from the home composer. Tied to that chat's id and
  // dropped once the learner goes anywhere else, so it can never be re-sent to another chat.
  const firstMessage = useRef<{ id: string; text: string } | null>(null);
  useEffect(() => {
    if (firstMessage.current && !(route.name === "chat" && route.id === firstMessage.current.id)) firstMessage.current = null;
  }, [route]);
  const [sidebarOpen, setSidebarOpen] = useState(() => stored("sidebar:open", "1") === "1");
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(stored("sidebar:width", "264")) || 264);
  const desktop = () => window.matchMedia("(min-width: 768px)").matches;
  const toggleSidebar = () => {
    if (!desktop()) return setDrawer((d) => !d);
    setSidebarOpen((o) => {
      store("sidebar:open", o ? "0" : "1");
      return !o;
    });
  };

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const move = (ev: PointerEvent) => setSidebarWidth(Math.min(420, Math.max(220, startW + ev.clientX - startX)));
    const up = (ev: PointerEvent) => {
      store("sidebar:width", String(Math.min(420, Math.max(220, startW + ev.clientX - startX))));
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  useEffect(() => setDrawer(false), [route]);

  const start = async (raw: string) => {
    setCreating(true);
    try {
      const id = await createConversation();
      firstMessage.current = { id, text: raw };
      go({ name: "chat", id });
    } finally {
      setCreating(false);
    }
  };

  if (route.name === "test") return <TestScreen key={`${route.id}-${route.review}`} {...route} />;

  return (
    <div className="flex h-full">
      {drawer && <div className="fixed inset-0 z-30 bg-scrim md:hidden" onClick={() => setDrawer(false)} aria-hidden />}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform md:relative md:translate-x-0 ${drawer ? "translate-x-0" : "-translate-x-full"} ${sidebarOpen ? "" : "md:hidden"}`}
      >
        <Sidebar route={route} onSearch={() => setSearch(true)} width={sidebarWidth} onCollapse={toggleSidebar} />
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onPointerDown={startResize}
          onDoubleClick={() => {
            setSidebarWidth(264);
            store("sidebar:width", "264");
          }}
          className="absolute inset-y-0 -right-1 hidden w-2 cursor-col-resize hover:bg-primary/20 md:block"
        />
      </div>
      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-rule px-4 py-3 md:hidden">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-md p-1.5 text-ink-soft hover:text-ink">
            <svg aria-hidden viewBox="0 0 20 20" className="size-5">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-serif text-[17px] font-semibold">IELTS Anything</span>
        </header>
        {!sidebarOpen && (
          <div className="absolute top-3 left-3 z-20 hidden md:block">
            <SidebarToggle onClick={toggleSidebar} label="Show sidebar (⌘B)" />
          </div>
        )}
        <div className="min-h-0 flex-1">
          {route.name === "chat" && (
            <Chat key={route.id} conversationId={route.id} initial={{ current: firstMessage.current?.id === route.id ? firstMessage.current.text : null }} />
          )}
          {route.name === "home" && (
            <div className="flex h-full items-center justify-center overflow-y-auto px-4 sm:px-8">
              <div className="w-full max-w-[680px] pb-[12vh]">
                <h1 className="mb-8 text-center font-serif text-[34px] font-normal leading-tight tracking-tight text-ink sm:text-[42px]">What do you want to practise?</h1>
                <PracticeComposer onSubmit={start} disabled={creating} />
              </div>
            </div>
          )}
          {route.name === "tests" && <TestsPage />}
          {route.name === "progress" && <ProgressPage />}
          {(route.name === "settings" || route.name === "sources") && <SettingsPage />}
        </div>
      </main>
      {search && <SearchPalette onClose={() => setSearch(false)} />}
    </div>
  );
}

function stored(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
