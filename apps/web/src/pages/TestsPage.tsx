import { useEffect, useRef, useState } from "react";
import { FAMILY_LABELS } from "@ielts/spec";
import { ConfirmDialog } from "../components/ConfirmDialog.tsx";
import { deleteTest, useLibrary, type LibraryItem } from "../data.ts";
import { go } from "../router.ts";
import { SKILLS } from "../skills.ts";

const open = (t: LibraryItem) => go({ name: "test", id: t.id, review: false, q: null, part: null });
const score = (t: LibraryItem) => (t.band != null ? t.band.toFixed(1) : t.total ? `${t.raw}/${t.total}` : "–");
const date = (t: LibraryItem) => new Date(t.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
// Unfinished first, then newest.
const order = (a: LibraryItem, b: LibraryItem) => Number(a.status === "scored") - Number(b.status === "scored") || b.created_at - a.created_at;

export function TestsPage() {
  const { data: tests, error } = useLibrary();
  const [skill, setSkill] = useState("all");
  const shown = (tests ?? []).filter((t) => skill === "all" || t.kind === skill).sort(order);
  const full = shown.filter((t) => t.mode === "full");
  const parts = shown.filter((t) => t.mode !== "full");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-4 py-12 sm:px-8">
        <h1 className="font-serif text-[32px] font-normal tracking-tight text-ink">Tests</h1>

        {tests && tests.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Skill">
            {[{ id: "all", label: "All" }, ...SKILLS].map((s) => (
              <button
                key={s.id}
                role="radio"
                aria-checked={skill === s.id}
                onClick={() => setSkill(s.id)}
                className={`rounded-lg px-3 py-1.5 text-[14px] transition-colors ${skill === s.id ? "bg-selected text-ink" : "text-ink-soft hover:bg-selected hover:text-ink"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {error && <p className="mt-8 text-danger">{error}</p>}
        {tests && tests.length === 0 && (
          <p className="mt-16 text-center text-ink-soft">Tests you create in a chat are kept here, so you can take them now or later.</p>
        )}
        {tests && tests.length > 0 && shown.length === 0 && (
          <p className="mt-12 text-ink-soft">No {SKILLS.find((s) => s.id === skill)?.label.toLowerCase()} tests yet.</p>
        )}

        {full.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-[13px] text-ink-faint">Full tests</h2>
            <div className="space-y-3">
              {full.map((t) => (
                <FullTest key={t.id} t={t} />
              ))}
            </div>
          </section>
        )}

        {parts.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-[13px] text-ink-faint">Parts and drills</h2>
            <ul className="divide-y divide-rule rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)]">
              {parts.map((t) => (
                <PartRow key={t.id} t={t} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

// Hidden while the row is hovered, where the options button takes its place.
function Status({ t }: { t: LibraryItem }) {
  const hide = "group-hover:invisible group-has-[[aria-expanded=true]]:invisible";
  if (t.status === "scored") return <span className={`font-serif text-[22px] leading-none tabular-nums text-ink ${hide}`}>{score(t)}</span>;
  if (t.status === "in_progress") return <span className={`text-[13px] text-ink-soft ${hide}`}>In progress</span>;
  if (t.status === "marking") return <span className={`text-[13px] text-ink-soft ${hide}`}>Marking…</span>;
  return <span className={`text-[13px] text-ink-faint ${hide}`}>Not taken</span>;
}

/** The row's options: Delete, after a confirmation. */
function TestMenu({ t, className }: { t: LibraryItem; className: string }) {
  const [menu, setMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <div ref={root} className={className}>
      <button
        onClick={() => setMenu((m) => !m)}
        aria-label={`Options for ${t.title}`}
        aria-expanded={menu}
        className={`rounded-md p-1.5 text-ink-faint hover:bg-selected hover:text-ink ${menu ? "visible" : "invisible group-hover:visible focus-visible:visible"}`}
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="currentColor">
          <circle cx="3.5" cy="8" r="1.2" />
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="12.5" cy="8" r="1.2" />
        </svg>
      </button>
      {menu && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-1 w-40 overflow-hidden rounded-xl border border-rule bg-surface py-1 shadow-[var(--shadow-float)]">
          <button role="menuitem" onClick={() => (setMenu(false), setConfirming(true))} className="block w-full px-3 py-1.5 text-left text-[14px] text-danger hover:bg-selected">
            Delete
          </button>
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title="Delete this test?"
          action="Delete"
          onCancel={() => (setConfirming(false), setError(null))}
          onConfirm={() =>
            deleteTest(t.id)
              .then(() => setConfirming(false))
              .catch((err) => setError(err.message))
          }
        >
          <p>
            “{t.title}” will be removed{t.status === "scored" || t.status === "marking" ? ", with your result" : t.status === "in_progress" ? ", with your saved answers" : ""}. This cannot be undone.
          </p>
          {error && <p className="mt-2 text-danger">{error}</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}

/** A full paper: a card listing its passages or parts. */
function FullTest({ t }: { t: LibraryItem }) {
  const skill = SKILLS.find((s) => s.id === t.kind)?.label ?? t.kind;
  return (
    <div className="group relative">
      <button
        onClick={() => open(t)}
        className="block w-full rounded-2xl border border-rule bg-surface px-5 py-4 text-left shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-rule-strong hover:shadow-[var(--shadow-float)]"
      >
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] text-ink">{t.title}</p>
            <p className="truncate text-[13px] text-ink-faint">
              {skill} · {date(t)}
            </p>
          </div>
          <Status t={t} />
        </div>
        <ol className="mt-3 grid gap-x-4 gap-y-1 border-t border-rule pt-3 text-[13px] text-ink-soft sm:grid-cols-3">
          {t.parts.map((p, i) => (
            <li key={i} className="flex min-w-0 gap-2">
              <span className="shrink-0 text-ink-faint">{i + 1}</span>
              <span className="truncate">{p}</span>
            </li>
          ))}
        </ol>
      </button>
      <TestMenu t={t} className="absolute top-4 right-4" />
    </div>
  );
}

/** A single passage, part or task: one compact row with what it practises. */
function PartRow({ t }: { t: LibraryItem }) {
  // Reading drills list their question types; Speaking drills name their part (never its questions).
  const focus = t.kind === "speaking" ? `Speaking · ${t.parts.join(", ")}` : t.kind === "writing" ? `Writing · ${t.parts.join(", ")}` : t.families.map((f) => FAMILY_LABELS[f as keyof typeof FAMILY_LABELS] ?? f).join(", ");
  return (
    <li className="group relative first:rounded-t-2xl last:rounded-b-2xl">
      <button onClick={() => open(t)} className="flex w-full items-center gap-4 rounded-[inherit] px-5 py-3.5 text-left hover:bg-paper/60">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] text-ink">{t.title}</span>
          <span className="block truncate text-[13px] text-ink-faint">
            {focus} · {date(t)}
          </span>
        </span>
        <Status t={t} />
      </button>
      <TestMenu t={t} className="absolute top-1/2 right-4 -translate-y-1/2" />
    </li>
  );
}
