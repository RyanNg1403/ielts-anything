import { useState } from "react";
import { FAMILY_LABELS } from "@ielts/spec";
import { useLibrary, type LibraryItem } from "../data.ts";
import { go } from "../router.ts";
import { SKILLS } from "../skills.ts";

const open = (t: LibraryItem) => go({ name: "test", id: t.id, review: false, q: null, part: null });
const score = (t: LibraryItem) => (t.band != null ? t.band.toFixed(1) : `${t.raw}/${t.total}`);
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
            <ul className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)]">
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

function Status({ t }: { t: LibraryItem }) {
  if (t.status === "scored") return <span className="font-serif text-[22px] leading-none tabular-nums text-ink">{score(t)}</span>;
  if (t.status === "in_progress") return <span className="text-[13px] text-ink-soft">In progress</span>;
  return <span className="text-[13px] text-ink-faint">Not taken</span>;
}

/** A full paper: a card listing its passages or parts. */
function FullTest({ t }: { t: LibraryItem }) {
  const skill = SKILLS.find((s) => s.id === t.kind)?.label ?? t.kind;
  return (
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
  );
}

/** A single passage, part or task: one compact row with what it practises. */
function PartRow({ t }: { t: LibraryItem }) {
  const focus = t.families.map((f) => FAMILY_LABELS[f as keyof typeof FAMILY_LABELS] ?? f).join(", ");
  return (
    <li>
      <button onClick={() => open(t)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-paper/60">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] text-ink">{t.title}</span>
          <span className="block truncate text-[13px] text-ink-faint">
            {focus} · {date(t)}
          </span>
        </span>
        <Status t={t} />
      </button>
    </li>
  );
}
