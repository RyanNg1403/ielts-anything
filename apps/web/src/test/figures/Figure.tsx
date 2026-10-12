import type { Figure as FigureData, Task1 } from "@ielts/spec";
import { BarChart, DataTable, LineChart, PieCharts } from "./charts.tsx";
import { MapPlans, ProcessDiagram } from "./diagrams.tsx";

/** A map or process diagram generated as an image, shown on white like the printed page. */
function DrawnFigure({ f }: { f: Extract<FigureData, { kind: "map" | "process" }> & { image: string } }) {
  const labels = f.kind === "process" ? f.stages.map((s, i) => `${i + 1}. ${s.label}`) : f.states.map((s) => `${s.label}: ${s.features.map((x) => x.label).filter(Boolean).join(", ")}`);
  return (
    <figure className="overflow-hidden rounded-md bg-white p-2">
      <img src={`/api/figures/${f.image}`} alt={`${f.title}. ${labels.join(". ")}`} className="mx-auto block max-w-full" />
    </figure>
  );
}

export function Figure({ f }: { f: FigureData }) {
  if ((f.kind === "map" || f.kind === "process") && f.image) return <DrawnFigure f={{ ...f, image: f.image }} />;
  switch (f.kind) {
    case "line":
      return <LineChart f={f} />;
    case "bar":
      return <BarChart f={f} />;
    case "pie":
      return <PieCharts f={f} />;
    case "table":
      return <DataTable f={f} />;
    case "process":
      return <ProcessDiagram f={f} />;
    case "map":
      return <MapPlans f={f} />;
  }
}

/** Every figure of a Task 1, one under the other, as printed. */
export function Task1Figures({ task }: { task: Task1 }) {
  return (
    <div className="space-y-8">
      {task.figures.map((f, i) => (
        <Figure key={i} f={f} />
      ))}
    </div>
  );
}
