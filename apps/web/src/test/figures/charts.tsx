// Line graphs, bar charts, pie charts and tables for Writing Task 1, drawn from the test data.
import { useId } from "react";
import type { BarFigure, LineFigure, PieFigure, TableFigure } from "@ielts/spec";
import { DASHES, FONT, FigureTitle, Legend, Lines, Marker, Patterns, Swatch, fillFor, fmt, niceScale, ticks, wrap } from "./shared.tsx";

export function LineChart({ f }: { f: LineFigure }) {
  const scale = niceScale(Math.max(...f.series.flatMap((s) => s.values)));
  const legendW = Math.max(...f.series.map((s) => s.name.length)) * 6.4 + 44;
  const [W, H, L, T, B] = [640, 380, 62, 12, 48];
  const plotW = W - L - legendW - 30;
  const plotH = H - T - B;
  const x = (i: number) => L + (f.points.length === 1 ? plotW / 2 : (i * plotW) / (f.points.length - 1));
  const y = (v: number) => T + plotH - (v / scale.top) * plotH;
  return (
    <figure className="overflow-x-auto">
      <FigureTitle>{f.title}</FigureTitle>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[540px]" role="img" aria-label={f.title}>
        <line x1={L} y1={T} x2={L} y2={T + plotH} className="stroke-ink" />
        <line x1={L} y1={T + plotH} x2={L + plotW} y2={T + plotH} className="stroke-ink" />
        {ticks(scale).map((v) => (
          <g key={v}>
            {v > 0 && <line x1={L} y1={y(v)} x2={L + plotW} y2={y(v)} className="stroke-rule-strong" />}
            <line x1={L - 5} y1={y(v)} x2={L} y2={y(v)} className="stroke-ink" />
            <text x={L - 8} y={y(v)} fontSize={FONT} textAnchor="end" dominantBaseline="central" className="fill-ink">
              {fmt(v)}
            </text>
          </g>
        ))}
        {f.points.map((p, i) => (
          <g key={p}>
            <line x1={x(i)} y1={T + plotH} x2={x(i)} y2={T + plotH + 5} className="stroke-ink" />
            <text x={x(i)} y={T + plotH + 16} fontSize={FONT} textAnchor="middle" className="fill-ink">
              {p}
            </text>
          </g>
        ))}
        <text x={L + plotW / 2} y={H - 6} fontSize={FONT + 1} fontWeight="600" textAnchor="middle" className="fill-ink">
          {f.xLabel}
        </text>
        <text transform={`translate(14 ${T + plotH / 2}) rotate(-90)`} fontSize={FONT + 1} fontWeight="600" textAnchor="middle" className="fill-ink">
          {f.yLabel}
        </text>
        {f.series.map((s, si) => (
          <g key={s.name}>
            <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" className="stroke-ink" strokeWidth="1.4" strokeDasharray={DASHES[si % 5]} />
            {s.values.map((v, i) => (
              <Marker key={i} i={si} x={x(i)} y={y(v)} />
            ))}
          </g>
        ))}
        <Legend
          x={L + plotW + 24}
          y={T + 40}
          items={f.series.map((s, si) => ({
            name: s.name,
            swatch: (
              <g>
                <line x1="0" y1="0" x2="26" y2="0" className="stroke-ink" strokeWidth="1.4" strokeDasharray={DASHES[si % 5]} />
                <Marker i={si} x={13} y={0} />
              </g>
            ),
          }))}
        />
      </svg>
    </figure>
  );
}

export function BarChart({ f }: { f: BarFigure }) {
  const id = useId().replace(/:/g, "");
  const scale = niceScale(Math.max(...f.series.flatMap((s) => s.values)));
  const horizontal = f.orientation === "horizontal";
  const n = f.series.length;
  const legend = n > 1;
  const catLines = f.categories.map((c) => wrap(c, horizontal ? 16 : Math.max(8, Math.floor(70 / f.categories.length) + 4)));
  const W = 640;
  const L = horizontal ? 122 : 62;
  const B = horizontal ? 44 : 30 + Math.max(...catLines.map((l) => l.length)) * 13;
  const T = legend ? 34 : 10;
  const H = horizontal ? T + B + f.categories.length * Math.max(26, n * 13 + 12) : 380;
  const plotW = W - L - 20;
  const plotH = H - T - B;
  const band = (horizontal ? plotH : plotW) / f.categories.length;
  const barW = Math.min(36, (band * 0.72) / n);
  const len = (v: number) => (v / scale.top) * (horizontal ? plotW : plotH);
  const at = (ci: number, si: number) => ci * band + (band - barW * n) / 2 + si * barW;
  return (
    <figure className="overflow-x-auto">
      <FigureTitle>{f.title}</FigureTitle>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[540px]" role="img" aria-label={f.title}>
        <Patterns id={id} />
        {legend &&
          (() => {
            const widths = f.series.map((s) => s.name.length * 6.4 + 36);
            let cx = L + (plotW - widths.reduce((a, b) => a + b, 0)) / 2;
            return f.series.map((s, si) => {
              const gx = cx;
              cx += widths[si]!;
              return (
                <g key={s.name} transform={`translate(${gx} 10)`}>
                  <Swatch id={id} i={si} width="14" height="10" y="-5" />
                  <text x="20" fontSize={FONT} dominantBaseline="central" className="fill-ink">
                    {s.name}
                  </text>
                </g>
              );
            });
          })()}
        {ticks(scale).map((v) =>
          horizontal ? (
            <g key={v}>
              <line x1={L + len(v)} y1={T} x2={L + len(v)} y2={T + plotH} className="stroke-rule-strong" />
              <text x={L + len(v)} y={T + plotH + 14} fontSize={FONT} textAnchor="middle" className="fill-ink">
                {fmt(v)}
              </text>
            </g>
          ) : (
            <g key={v}>
              <line x1={L} y1={T + plotH - len(v)} x2={L + plotW} y2={T + plotH - len(v)} className="stroke-rule-strong" />
              <text x={L - 8} y={T + plotH - len(v)} fontSize={FONT} textAnchor="end" dominantBaseline="central" className="fill-ink">
                {fmt(v)}
              </text>
            </g>
          ),
        )}
        {f.categories.map((c, ci) => (
          <g key={c}>
            {f.series.map((s, si) => {
              const v = s.values[ci] ?? 0;
              return horizontal ? (
                <Swatch key={si} id={id} i={si} x={L} y={T + at(ci, si)} width={len(v)} height={barW} />
              ) : (
                <Swatch key={si} id={id} i={si} x={L + at(ci, si)} y={T + plotH - len(v)} width={barW} height={len(v)} />
              );
            })}
            {horizontal ? (
              <Lines x={L - 8} y={T + ci * band + band / 2} lines={catLines[ci]!} anchor="end" />
            ) : (
              <Lines x={L + ci * band + band / 2} y={T + plotH + 10 + (catLines[ci]!.length - 1) * 6.6} lines={catLines[ci]!} />
            )}
          </g>
        ))}
        <line x1={L} y1={T} x2={L} y2={T + plotH} className="stroke-ink" />
        <line x1={L} y1={T + plotH} x2={L + plotW} y2={T + plotH} className="stroke-ink" />
        {horizontal ? (
          <text x={L + plotW / 2} y={H - 6} fontSize={FONT + 1} fontWeight="600" textAnchor="middle" className="fill-ink">
            {f.valueLabel}
          </text>
        ) : (
          <>
            <text transform={`translate(14 ${T + plotH / 2}) rotate(-90)`} fontSize={FONT + 1} fontWeight="600" textAnchor="middle" className="fill-ink">
              {f.valueLabel}
            </text>
            {f.categoryLabel && (
              <text x={L + plotW / 2} y={H - 6} fontSize={FONT + 1} fontWeight="600" textAnchor="middle" className="fill-ink">
                {f.categoryLabel}
              </text>
            )}
          </>
        )}
      </svg>
    </figure>
  );
}

export function PieCharts({ f }: { f: PieFigure }) {
  const id = useId().replace(/:/g, "");
  const names = [...new Set(f.pies.flatMap((p) => p.slices.map((s) => s.name)))];
  const perRow = f.pies.length === 4 ? 2 : f.pies.length;
  const R = f.pies.length === 1 ? 110 : 78;
  const cellW = 640 / perRow;
  const cellH = R * 2 + 76;
  const rows = Math.ceil(f.pies.length / perRow);
  const legendRows = Math.ceil(names.length / 3);
  const H = rows * cellH + legendRows * 20 + 16;
  return (
    <figure className="overflow-x-auto">
      <FigureTitle>{f.title}</FigureTitle>
      <svg viewBox={`0 0 640 ${H}`} className="w-full min-w-[540px]" role="img" aria-label={f.title}>
        <Patterns id={id} />
        {f.pies.map((p, pi) => {
          const cx = (pi % perRow) * cellW + cellW / 2;
          const cy = Math.floor(pi / perRow) * cellH + 48 + R;
          let a0 = -Math.PI / 2;
          return (
            <g key={p.label}>
              <text x={cx} y={cy - R - 32} fontSize={FONT + 2} fontWeight="600" textAnchor="middle" className="fill-ink">
                {p.label}
              </text>
              {p.slices.map((s) => {
                const a1 = a0 + (s.percent / 100) * Math.PI * 2;
                const mid = (a0 + a1) / 2;
                const large = a1 - a0 > Math.PI ? 1 : 0;
                const d = `M${cx} ${cy}L${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)}A${R} ${R} 0 ${large} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)}Z`;
                a0 = a1;
                const i = names.indexOf(s.name);
                const inside = s.percent >= 9;
                const lr = inside ? R * 0.62 : R + 14;
                const { fill, className: cls, dark, busy } = fillFor(id, i);
                const onDark = inside && dark;
                const halo = inside && busy;
                return (
                  <g key={s.name}>
                    <path d={d} fill={fill} className={cls} strokeWidth="0.8" />
                    <Lines
                      x={cx + lr * Math.cos(mid)}
                      y={cy + lr * Math.sin(mid)}
                      lines={[`${fmt(s.percent)}%`]}
                      fontWeight="600"
                      halo={halo}
                      className={onDark ? "fill-surface" : halo ? "fill-ink stroke-surface" : "fill-ink"}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
        {names.map((n, i) => (
          <g key={n} transform={`translate(${110 + (i % 3) * 160} ${rows * cellH + 8 + Math.floor(i / 3) * 20})`}>
            <Swatch id={id} i={i} width="14" height="10" y="-5" />
            <text x="20" fontSize={FONT} dominantBaseline="central" className="fill-ink">
              {n}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

export function DataTable({ f }: { f: TableFigure }) {
  return (
    <figure className="overflow-x-auto">
      <FigureTitle>{f.title}</FigureTitle>
      <div className="overflow-x-auto">
        <table className="mx-auto border-collapse text-[13px] text-ink">
          <thead>
            <tr>
              <th className="border border-ink px-3 py-1.5 text-left font-semibold">{f.rowHeader}</th>
              {f.columns.map((c) => (
                <th key={c} className="border border-ink px-3 py-1.5 text-center font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {f.rows.map((r) => (
              <tr key={r.label}>
                <th className="border border-ink px-3 py-1.5 text-left font-normal">{r.label}</th>
                {r.cells.map((c, i) => (
                  <td key={i} className="border border-ink px-3 py-1.5 text-center tabular-nums">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
