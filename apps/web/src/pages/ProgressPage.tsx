import { useState } from "react";
import { pct } from "../analytics.ts";
import { useProgress } from "../data.ts";
import { go } from "../router.ts";
import { FAMILY_LABELS } from "@ielts/spec";
import { SKILLS } from "../skills.ts";

export function ProgressPage() {
  const { data, error } = useProgress();
  if (error) return <p className="p-10 text-danger">{error}</p>;
  if (!data) return null;
  const empty = data.history.length === 0;

  const families = Object.entries(data.families)
    .map(([family, v]) => ({ family, label: FAMILY_LABELS[family as keyof typeof FAMILY_LABELS] ?? family, ...v }))
    .sort((a, b) => a.correct / a.total - b.correct / b.total);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[860px] px-4 py-10 sm:px-8">
        <h1 className="font-serif text-[28px] font-semibold text-ink">Progress</h1>

        {empty ? (
          <div className="mt-16 text-center">
            <p className="text-ink-soft">Your bands and strongest and weakest question types show up after your first test.</p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {SKILLS.map((s) => (
                <SkillTile key={s.id} skill={s.id} label={s.label} history={data.history.filter((h) => h.skill === s.id)} />
              ))}
            </div>

            {families.length > 0 && (
              <section className="mt-12">
                <h2 className="font-serif text-xl font-semibold text-ink">Question types</h2>
                <ul className="mt-4 divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)]">
                  {families.map((f) => {
                    const p = pct(f.correct, f.total);
                    return (
                      <li key={f.family} className="grid grid-cols-[minmax(0,1fr)_minmax(0,12rem)_3.5rem] items-center gap-4 px-5 py-3 text-[14px]">
                        <span className="truncate text-ink">{f.label}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-paper" title={`${p}% correct`}>
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(p, 2)}%` }} />
                        </span>
                        <span className="text-right tabular-nums text-ink-soft">{p}%</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type Point = { testId: string; title: string; mode: string; raw: number; total: number; band: number | null; submittedAt: number };

function SkillTile({ skill, label, history }: { skill: string; label: string; history: Point[] }) {
  const full = history.filter((h) => h.band != null);
  const latest = full[full.length - 1];
  const lastDrill = history.filter((h) => h.band == null).at(-1);
  return (
    <section className="rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)] p-5">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <span className="size-2 rounded-full" style={{ background: `var(--color-${skill})` }} />
        {label}
      </h3>
      {history.length === 0 ? (
        <div className="mt-6 flex items-end justify-between">
          <p className="font-serif text-[40px] font-semibold leading-none text-ink-faint">—</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-end gap-4">
            <p>
              <span className="block font-serif text-[40px] font-semibold leading-none text-ink">
                {latest ? latest.band!.toFixed(1) : lastDrill ? `${lastDrill.raw}/${lastDrill.total}` : "—"}
              </span>
              <span className="mt-1 block text-[13px] text-ink-soft">{latest ? (skill === "reading" ? "Band, latest full test" : "Band, latest test") : "Latest drill"}</span>
            </p>
            <Trend points={full} />
          </div>
        </>
      )}
    </section>
  );
}

/** Band over time for one skill. One series, so no legend; hover shows each test. */
function Trend({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <div className="flex-1" />;
  const W = 220;
  const H = 64;
  const pad = 6;
  const min = 4;
  const max = 9;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (points.length - 1);
  const y = (b: number) => H - pad - ((b - min) / (max - min)) * (H - pad * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.band!)}`).join(" ");
  const h = hover != null ? points[hover] : null;
  return (
    <div className="relative ml-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible" onMouseLeave={() => setHover(null)}>
        <path d={d} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.testId} onMouseEnter={() => setHover(i)} onClick={() => go({ name: "test", id: p.testId, review: false, q: null, part: null })} className="cursor-pointer">
            <circle cx={x(i)} cy={y(p.band!)} r="12" fill="transparent" />
            <circle cx={x(i)} cy={y(p.band!)} r={hover === i ? 5 : 4} fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="2" />
          </g>
        ))}
      </svg>
      {h && (
        <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-[16rem] rounded-md bg-ink px-2.5 py-1.5 text-[12px] text-on-primary shadow">
          <p className="truncate font-medium">{h.title}</p>
          <p className="text-surface/75">
            Band {h.band!.toFixed(1)}
            {h.total ? ` · ${h.raw}/${h.total}` : ""} · {new Date(h.submittedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
          </p>
        </div>
      )}
    </div>
  );
}
