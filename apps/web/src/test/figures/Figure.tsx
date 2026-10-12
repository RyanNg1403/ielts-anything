import type { Figure as FigureData, Task1 } from "@ielts/spec";
import { BarChart, DataTable, LineChart, PieCharts } from "./charts.tsx";
import { MapPlans, ProcessDiagram } from "./diagrams.tsx";

export function Figure({ f }: { f: FigureData }) {
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
