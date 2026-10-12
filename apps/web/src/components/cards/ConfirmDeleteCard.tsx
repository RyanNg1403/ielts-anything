import type { DeleteCandidate } from "../../api.ts";
import { SKILLS } from "../../skills.ts";

const skillLabel = (id: string) => SKILLS.find((s) => s.id === id)?.label ?? id;

/** The tutor asked to delete tests: nothing is deleted until the learner presses Delete here. */
export function ConfirmDeleteCard({
  tests,
  outcome,
  onAnswer,
}: {
  tests: DeleteCandidate[];
  outcome: "deleted" | "kept" | null;
  onAnswer: (confirmed: boolean) => void;
}) {
  const these = tests.length === 1 ? "this test" : `these ${tests.length} tests`;
  const title = outcome === "deleted" ? `Deleted ${these}` : outcome === "kept" ? `Kept ${these}` : `Delete ${these}?`;

  return (
    <div className="rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)]">
      <div className="px-5 pt-5 pb-4">
        <p className="font-serif text-[19px] font-medium text-ink">{title}</p>
        <ul className="mt-3 space-y-1.5">
          {tests.map((t) => (
            <li key={t.testId} className="text-[15px]">
              <span className={outcome === "deleted" ? "text-ink-faint line-through" : "text-ink"}>{t.title}</span>
              <span className="text-[13px] text-ink-faint">
                {" "}
                {skillLabel(t.skill)}
                {t.taken ? ", taken" : ""}
              </span>
            </li>
          ))}
        </ul>
        {outcome === null && (
          <p className="mt-3 text-[14px] text-ink-soft">{tests.some((t) => t.taken) ? "Results and recordings go with them. " : ""}This cannot be undone.</p>
        )}
      </div>
      {outcome === null && (
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={() => onAnswer(false)} className="rounded-lg px-3.5 py-2 text-[14px] text-ink hover:bg-selected">
            Keep
          </button>
          <button onClick={() => onAnswer(true)} className="rounded-lg bg-danger px-3.5 py-2 text-[14px] font-medium text-surface hover:opacity-90">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
