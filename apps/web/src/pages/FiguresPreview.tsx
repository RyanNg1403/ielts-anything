// Development page (#/dev/figures): every Task 1 figure kind drawn from sample data, to check the
// drawings by eye in light and dark mode.
import { WRITING_WRAPPER, task1Family } from "@ielts/spec";
import { SAMPLE_TASK1 } from "@ielts/spec/samples";
import { Task1Figures } from "../test/figures/Figure.tsx";

export function FiguresPreview() {
  return (
    <div className="h-full overflow-y-auto bg-paper">
      <div className="mx-auto max-w-[720px] space-y-10 px-4 py-8">
        {Object.entries(SAMPLE_TASK1).map(([name, task]) => (
          <section key={name} id={name} className="rounded-lg border border-rule bg-surface p-6">
            <p className="mb-3 text-[12px] text-ink-faint">{task1Family(task)}</p>
            <div className="mb-5 border border-ink px-4 py-3 text-[14px] font-semibold italic text-ink">
              <p>{task.intro}</p>
              <p className="mt-2">{WRITING_WRAPPER[1].directive}</p>
            </div>
            <Task1Figures task={task} />
          </section>
        ))}
      </div>
    </div>
  );
}
