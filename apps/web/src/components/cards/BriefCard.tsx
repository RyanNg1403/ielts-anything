import type { BriefCard as Brief } from "../../api.ts";
import { skillMeta } from "../../skills.ts";

/** The practice plan, drawn like the cover sheet of an IELTS paper. */
export function BriefCard({ card }: { card: Brief }) {
  const meta = skillMeta(card.skill);
  const accent = `var(--color-${card.skill})`;
  return (
    <article className="overflow-hidden rounded-xl border border-rule-strong bg-surface">
      <header className="flex items-baseline justify-between gap-4 border-b border-rule px-6 pt-5 pb-4" style={{ boxShadow: `inset 4px 0 0 ${accent}` }}>
        <div>
          <p className="text-sm text-ink-soft">
            IELTS Academic {meta.label} · {card.mode === "full" ? "Full test" : "Drill"}
          </p>
          <h3 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink">{card.title}</h3>
        </div>
        <p className="shrink-0 text-right">
          <span className="block font-serif text-2xl font-semibold text-ink">{card.estimatedMinutes}</span>
          <span className="text-sm text-ink-soft">minutes</span>
        </p>
      </header>
      <div className="px-6 py-5">
        <p className="font-serif text-[16px] italic leading-relaxed text-ink-soft">{card.topic}</p>
        <ol className="mt-4 space-y-2">
          {card.outline.map((line, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-ink-faint">{partLabel(card.skill, i)}</span>
              <span className="text-ink">{line.replace(/^(passage|part|task)\s*\d+\s*[:.\-–—]\s*/i, "")}</span>
            </li>
          ))}
        </ol>
        {card.questionTypes.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {card.questionTypes.map((t) => (
              <span key={t} className="rounded-md px-2 py-0.5 text-[13px]" style={{ background: `var(--color-${card.skill}-wash)`, color: accent }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function partLabel(skill: Brief["skill"], i: number) {
  if (skill === "reading") return `Passage ${i + 1}`;
  if (skill === "listening") return `Part ${i + 1}`;
  if (skill === "writing") return `Task ${i + 1}`;
  return `Part ${i + 1}`;
}
