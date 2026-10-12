// Process diagrams and before/after plans for Writing Task 1, drawn from the test data.
import { useId } from "react";
import { MAP_GRID, rect, type MapFeature, type MapFigure, type ProcessFigure } from "@ielts/spec";
import { FONT, FigureTitle, Lines, Patterns, wrap } from "./shared.tsx";

const NODE_W = 112;
const NODE_H = 58;
const GAP_X = 66;
const GAP_Y = 44;
/** Room outside the stages for arrows that go round the diagram (a cycle closing, a long jump). */
const MARGIN = 30;
const TOP = GAP_Y / 2 + 4;

/** Stages flow left to right, then snake back on the next row, as on the Cambridge pages.
 *  Stages that happen side by side (parallel routes) share a column. */
function layoutProcess(f: ProcessFigure) {
  const index = new Map(f.stages.map((s, i) => [s.id, i]));
  const forward = f.arrows.filter((a) => (index.get(a.to) ?? 0) > (index.get(a.from) ?? 0));
  const rank = new Map<string, number>();
  for (const s of f.stages) {
    const before = forward.filter((a) => a.to === s.id).map((a) => (rank.get(a.from) ?? 0) + 1);
    rank.set(s.id, Math.max(0, ...before));
  }
  const ranks = Math.max(...rank.values()) + 1;
  // Up to 4 per row, with rows as even as possible: 9 stages make 3 rows of 3, not 4 + 4 + 1.
  const COLS = Math.ceil(ranks / Math.ceil(ranks / 4));
  const stacks = Array.from({ length: ranks }, (_, r) => f.stages.filter((s) => rank.get(s.id) === r));
  const bands = Math.ceil(ranks / COLS);
  const bandH = Array.from({ length: bands }, (_, b) => Math.max(...stacks.slice(b * COLS, b * COLS + COLS).map((s) => s.length)) * (NODE_H + 14) - 14);
  const bandY = bandH.map((_, b) => bandH.slice(0, b).reduce((y, h) => y + h + GAP_Y, 0));
  const pos = new Map<string, { x: number; y: number; band: number; col: number }>();
  stacks.forEach((stack, r) => {
    const band = Math.floor(r / COLS);
    const col = band % 2 === 0 ? r % COLS : COLS - 1 - (r % COLS);
    const top = bandY[band]! + (bandH[band]! - (stack.length * (NODE_H + 14) - 14)) / 2;
    stack.forEach((s, k) => pos.set(s.id, { x: MARGIN + col * (NODE_W + GAP_X), y: TOP + top + k * (NODE_H + 14), band, col }));
  });
  const height = TOP + bandY[bands - 1]! + bandH[bands - 1]! + GAP_Y / 2 + 4;
  return { pos, height, cols: COLS };
}

export function ProcessDiagram({ f }: { f: ProcessFigure }) {
  const id = useId().replace(/:/g, "");
  const { pos, height, cols } = layoutProcess(f);
  const W = MARGIN * 2 + cols * NODE_W + (cols - 1) * GAP_X;
  const number = new Map(f.stages.map((s, i) => [s.id, i + 1]));
  return (
    <figure className="overflow-x-auto">
      <FigureTitle>{f.title}</FigureTitle>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full min-w-[540px]" role="img" aria-label={f.title}>
        <defs>
          <marker id={`${id}-head`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10Z" className="fill-ink" />
          </marker>
        </defs>
        {f.arrows.map((a, i) => {
          const s = pos.get(a.from);
          const t = pos.get(a.to);
          if (!s || !t) return null;
          const [scx, scy, tcx, tcy] = [s.x + NODE_W / 2, s.y + NODE_H / 2, t.x + NODE_W / 2, t.y + NODE_H / 2];
          let d: string;
          let mid: [number, number];
          if (s.band === t.band && Math.abs(s.col - t.col) === 1) {
            const dir = tcx > scx ? 1 : -1;
            const [x1, x2] = [scx + (dir * NODE_W) / 2 + dir * 3, tcx - (dir * NODE_W) / 2 - dir * 5];
            d = `M${x1} ${scy}L${x2} ${tcy}`;
            mid = [(x1 + x2) / 2, (scy + tcy) / 2];
          } else if (s.col === t.col && Math.abs(s.band - t.band) === 1) {
            const dir = tcy > scy ? 1 : -1;
            const [y1, y2] = [scy + (dir * NODE_H) / 2 + dir * 3, tcy - (dir * NODE_H) / 2 - dir * 5];
            d = `M${scx} ${y1}L${tcx} ${y2}`;
            mid = [scx, (y1 + y2) / 2];
          } else if (t.band === s.band + 1) {
            // Down one row to another column: along the gap between the rows, then into the target.
            const down = tcy > scy;
            const y1 = scy + ((down ? 1 : -1) * NODE_H) / 2 + (down ? 3 : -3);
            const gy = down ? y1 + GAP_Y / 2 - 3 : y1 - GAP_Y / 2 + 3;
            const y2 = tcy - ((down ? 1 : -1) * NODE_H) / 2 - (down ? 5 : -5);
            d = `M${scx} ${y1}L${scx} ${gy}L${tcx} ${gy}L${tcx} ${y2}`;
            mid = [(scx + tcx) / 2, gy];
          } else {
            // Anything else (a cycle closing, a jump back or over a stage) goes round the outside,
            // so it never passes through another stage: out below the source, along the nearer
            // side, then into the top of the target.
            const left = s.col + t.col <= cols - 1;
            const xm = left ? MARGIN / 2 : W - MARGIN / 2;
            const [y1, gyS, gyT, y2] = [s.y + NODE_H + 3, s.y + NODE_H + GAP_Y / 2, t.y - GAP_Y / 2, t.y - 5];
            d = `M${scx} ${y1}L${scx} ${gyS}L${xm} ${gyS}L${xm} ${gyT}L${tcx} ${gyT}L${tcx} ${y2}`;
            mid = [xm, (gyS + gyT) / 2];
          }
          return (
            <g key={i}>
              <path d={d} fill="none" className="stroke-ink" strokeWidth="1.6" markerEnd={`url(#${id}-head)`} />
              {a.label && (
                (() => {
                  // Sit the label wholly above the arrow, however many lines it wraps to.
                  const lines = wrap(a.label, 12);
                  return <Lines x={mid[0]} y={mid[1] - 9 - ((lines.length - 1) * (FONT - 1) * 1.2) / 2} lines={lines} size={FONT - 1} fontStyle="italic" halo />;
                })()
              )}
            </g>
          );
        })}
        {f.stages.map((s) => {
          const p = pos.get(s.id)!;
          return (
            <g key={s.id}>
              <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx="6" className="fill-surface stroke-ink" strokeWidth="1" />
              {f.numbered && (
                <g>
                  <circle cx={p.x + 4} cy={p.y + 4} r="9" className="fill-surface stroke-ink" strokeWidth="1" />
                  <text x={p.x + 4} y={p.y + 4.5} fontSize={FONT - 1} fontWeight="600" textAnchor="middle" dominantBaseline="central" className="fill-ink">
                    {number.get(s.id)}
                  </text>
                </g>
              )}
              <Lines x={p.x + NODE_W / 2} y={p.y + NODE_H / 2} lines={wrap(s.label, 19)} size={FONT} fontWeight="600" />
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

const S = 6; // map units to pixels

/** Roads draw in three passes (edges, surface, names) so crossing roads join cleanly. */
function Feature({ x, id, layer = "label" }: { x: MapFeature; id: string; layer?: "outline" | "fill" | "label" }) {
  if (x.kind === "road" || x.kind === "path") {
    const pts = x.points.map(([px, py]) => `${px! * S},${py! * S}`).join(" ");
    // Label the longest stretch, turned to run along it.
    const segs = x.points.slice(1).map((p, i) => [x.points[i]!, p] as const);
    const [a, b] = segs.reduce((m, s) => (Math.hypot(s[1][0]! - s[0][0]!, s[1][1]! - s[0][1]!) > Math.hypot(m[1][0]! - m[0][0]!, m[1][1]! - m[0][1]!) ? s : m));
    let angle = (Math.atan2(b[1]! - a[1]!, b[0]! - a[0]!) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    const [mx, my] = [(a[0]! + (b[0]! - a[0]!) * 0.4) * S, (a[1]! + (b[1]! - a[1]!) * 0.4) * S];
    if (x.kind === "road")
      return layer === "outline" ? (
        <polyline points={pts} fill="none" className="stroke-ink" strokeWidth="16" strokeLinejoin="round" />
      ) : layer === "fill" ? (
        <polyline points={pts} fill="none" className="stroke-surface" strokeWidth="13" strokeLinejoin="round" />
      ) : x.label ? (
        <text transform={`translate(${mx} ${my}) rotate(${angle})`} fontSize={FONT - 1} textAnchor="middle" dominantBaseline="central" className="fill-ink">
          {x.label}
        </text>
      ) : null;
    if (layer !== "label") return null;
    return (
      <g>
        <polyline points={pts} fill="none" className="stroke-ink" strokeWidth="1.4" strokeDasharray="4 3" />
        {x.label && (
          <Lines x={0} y={0} lines={[x.label]} transform={`translate(${mx} ${my}) rotate(${angle}) translate(0 -8)`} size={FONT - 1} fontStyle="italic" halo />
        )}
      </g>
    );
  }
  const r = rect(x.box);
  if (!r) return null;
  const [px, py, pw, ph] = [r.x * S, r.y * S, r.w * S, r.h * S];
  const lines = wrap(x.label, Math.max(6, Math.floor(pw / 7)));
  const label = x.label && (
    <Lines x={px + pw / 2} y={py + ph / 2} lines={lines} size={FONT} fontStyle={x.kind === "water" ? "italic" : undefined} halo={x.kind !== "building"} />
  );
  switch (x.kind) {
    case "water":
      return (
        <g>
          <rect x={px} y={py} width={pw} height={ph} className="fill-accent/10" />
          <rect x={px} y={py} width={pw} height={ph} fill={`url(#${id}-waves)`} />
          {label}
        </g>
      );
    case "trees": {
      // Tree symbols fill the area, so the name sits on a small plate.
      const plateW = Math.max(...lines.map((l) => l.length)) * 6.6 + 10;
      const plateH = lines.length * 13.2 + 6;
      return (
        <g>
          <rect x={px} y={py} width={pw} height={ph} fill={`url(#${id}-trees)`} className="stroke-ink-soft" strokeWidth="0.8" />
          {x.label && <rect x={px + (pw - plateW) / 2} y={py + (ph - plateH) / 2} width={plateW} height={plateH} rx="2" className="fill-surface" />}
          {label}
        </g>
      );
    }
    case "area":
      return (
        <g>
          <rect x={px} y={py} width={pw} height={ph} className="fill-surface stroke-ink" strokeWidth="1" strokeDasharray="5 3" />
          {label}
        </g>
      );
    default:
      return (
        <g>
          <rect x={px} y={py} width={pw} height={ph} className="fill-surface stroke-ink" strokeWidth="1.3" />
          {label}
        </g>
      );
  }
}

function Compass({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="fill-ink">
      <path d="M0 -16L0 16M-16 0L16 0" className="stroke-ink" strokeWidth="1" />
      <path d="M0 -18L-3.5 -10L3.5 -10Z M18 0L10 -3.5L10 3.5Z M0 18L-3.5 10L3.5 10Z M-18 0L-10 -3.5L-10 3.5Z" />
      {[
        ["N", 0, -26],
        ["E", 27, 0],
        ["S", 0, 27],
        ["W", -27, 0],
      ].map(([t, dx, dy]) => (
        <text key={t as string} x={dx as number} y={dy as number} fontSize={FONT - 1} textAnchor="middle" dominantBaseline="central">
          {t}
        </text>
      ))}
    </g>
  );
}

export function MapPlans({ f }: { f: MapFigure }) {
  const id = useId().replace(/:/g, "");
  const [W, H] = [MAP_GRID.width * S, MAP_GRID.height * S];
  const pad = f.compass ? 76 : 0;
  return (
    <figure className="overflow-x-auto">
      <FigureTitle>{f.title}</FigureTitle>
      <div className="space-y-5">
        {f.states.map((s) => (
          <div key={s.label}>
            <p className="mb-1.5 text-center text-[13px] font-semibold text-ink">{s.label}</p>
            <svg viewBox={`${-pad} -4 ${W + pad + 4} ${H + 8}`} className="w-full min-w-[540px]" role="img" aria-label={s.label}>
              <Patterns id={id} />
              <rect x="0" y="0" width={W} height={H} className="fill-surface stroke-ink" strokeWidth="1" />
              <svg x="0" y="0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="hidden">
                {s.features.filter((x) => x.kind === "water").map((x, i) => <Feature key={i} x={x} id={id} />)}
                {s.features.filter((x) => x.kind === "area" || x.kind === "trees").map((x, i) => <Feature key={i} x={x} id={id} />)}
                {(["outline", "fill", "label"] as const).flatMap((layer) =>
                  s.features.filter((x) => x.kind === "road").map((x, i) => <Feature key={`${layer}${i}`} x={x} id={id} layer={layer} />),
                )}
                {s.features.filter((x) => x.kind === "path" || x.kind === "building").map((x, i) => <Feature key={i} x={x} id={id} />)}
              </svg>
              {f.compass && <Compass x={-pad / 2} y={36} />}
            </svg>
          </div>
        ))}
      </div>
    </figure>
  );
}
