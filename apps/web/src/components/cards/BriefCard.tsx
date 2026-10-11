import type { BriefCard as Brief } from "../../api.ts";
import { FAMILY_LABELS } from "@ielts/spec";
import { skillMeta } from "../../skills.ts";

/** The practice plan, drawn like the cover sheet of an IELTS paper. */
export function BriefCard({ card }: { card: Brief }) {
  const meta = skillMeta(card.skill);
  const single = card.outline.length === 1;
  const accent = `var(--color-${card.skill})`;
  return (
    <article className="overflow-hidden rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)]">
      <header className="border-b border-rule px-6 pt-5 pb-4">
        <h3 className="font-serif text-[22px] font-medium leading-snug text-ink">{card.title}</h3>
        <p className="mt-1 text-sm text-ink-soft">
          {meta.label} {card.mode === "full" ? "test" : "drill"} · {card.estimatedMinutes} min
        </p>
      </header>
      <div className="px-6 py-5">
        <ol className="space-y-2">
          {card.outline.map((line, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              {!single && <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-ink-faint">{partLabel(card.skill, i)}</span>}
              <span className="text-ink">{line.replace(/^(passage|part|task)\s*\d+\s*[:.\-–—]\s*/i, "")}</span>
            </li>
          ))}
        </ol>
        {card.questionTypes.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {card.questionTypes.map((t) => (
              <span key={t} className="rounded-md px-2 py-0.5 text-[13px]" style={{ background: `var(--color-${card.skill}-wash)`, color: accent }}>
                {FAMILY_LABELS[t as keyof typeof FAMILY_LABELS] ?? t}
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
