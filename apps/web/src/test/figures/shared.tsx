// Drawing helpers shared by the Task 1 figures. Figures copy the Cambridge papers: black ink on
// white, series told apart by dash, marker and fill pattern rather than colour.
import type { ReactNode } from "react";

export const FONT = 11;

/** Fills for bars and pie slices, in order: solid, light, hatched, white, dotted. */
export function Patterns({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={`${id}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" className="fill-surface" />
        <line x1="0" y1="0" x2="0" y2="6" className="stroke-ink" strokeWidth="1.6" />
      </pattern>
      <pattern id={`${id}-dots`} width="5" height="5" patternUnits="userSpaceOnUse">
        <rect width="5" height="5" className="fill-surface" />
        <circle cx="2.5" cy="2.5" r="1" className="fill-ink" />
      </pattern>
      <pattern id={`${id}-waves`} width="16" height="10" patternUnits="userSpaceOnUse">
        <path d="M2 6 q2 -3 4 0 t4 0" fill="none" className="stroke-ink-faint" strokeWidth="0.8" />
      </pattern>
      <pattern id={`${id}-trees`} width="9" height="9" patternUnits="userSpaceOnUse">
        <circle cx="4.5" cy="4.5" r="2.6" fill="none" className="stroke-ink-soft" strokeWidth="0.8" />
      </pattern>
    </defs>
  );
}

export function Swatch({ id, i, ...rest }: { id: string; i: number } & React.SVGProps<SVGRectElement>) {
  const k = i % 5;
  const fill = k === 2 ? `url(#${id}-hatch)` : k === 4 ? `url(#${id}-dots)` : undefined;
  const cls = k === 0 ? "fill-ink/80" : k === 1 ? "fill-ink/30" : k === 3 ? "fill-surface" : "";
  return <rect {...rest} fill={fill} className={`${cls} stroke-ink`} strokeWidth="0.8" />;
}

export const DASHES = ["", "6 4", "1.5 3", "8 3 2 3", "3 2"];

export function Marker({ i, x, y }: { i: number; x: number; y: number }) {
  const s = 3.6;
  switch (i % 5) {
    case 0:
      return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} className="fill-ink" />;
    case 1:
      return <path d={`M${x} ${y - s - 1}L${x + s + 1} ${y}L${x} ${y + s + 1}L${x - s - 1} ${y}Z`} className="fill-surface stroke-ink" strokeWidth="1" />;
    case 2:
      return <path d={`M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}`} className="stroke-ink" strokeWidth="1.4" />;
    case 3:
      return <path d={`M${x} ${y - s - 1}L${x + s + 1} ${y + s}L${x - s - 1} ${y + s}Z`} className="fill-ink" />;
    default:
      return <circle cx={x} cy={y} r={s} className="fill-surface stroke-ink" strokeWidth="1" />;
  }
}

/** A round scale from 0 that fits every value, with 4-8 ticks. */
export function niceScale(max: number) {
  if (max <= 0) return { top: 1, step: 0.25 };
  const raw = max / 6;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return { top: Math.ceil(max / step) * step, step };
}

export function ticks({ top, step }: { top: number; step: number }) {
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => +(i * step).toPrecision(10));
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));

/** Break text into lines of at most `max` characters, at spaces. */
export function wrap(text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    if (line && (line + " " + w).length > max) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return lines;
}

export function Lines({ x, y, lines, size = FONT, anchor = "middle", halo = false, ...rest }: {
  x: number;
  y: number;
  lines: string[];
  size?: number;
  anchor?: "start" | "middle" | "end";
  /** A paper-coloured outline so the text stays readable over patterns and lines. */
  halo?: boolean;
} & React.SVGProps<SVGTextElement>) {
  const lh = size * 1.2;
  return (
    <text
      x={x}
      y={y - ((lines.length - 1) * lh) / 2}
      fontSize={size}
      textAnchor={anchor}
      dominantBaseline="central"
      className={halo ? "fill-ink stroke-surface" : "fill-ink"}
      paintOrder={halo ? "stroke" : undefined}
      strokeWidth={halo ? 4 : undefined}
      strokeLinejoin="round"
      {...rest}
    >
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i ? lh : 0}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

/** Figure heading in Cambridge style: bold, centred over the drawing. */
export function FigureTitle({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-center text-[15px] font-semibold text-ink">{children}</p>;
}

/** Key in a ruled box, as on the Cambridge line graphs. */
export function Legend({ items, x, y }: { items: { name: string; swatch: ReactNode }[]; x: number; y: number }) {
  const w = Math.max(...items.map((i) => i.name.length)) * 6.4 + 44;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={items.length * 18 + 8} className="fill-surface stroke-ink" strokeWidth="0.8" />
      {items.map((it, i) => (
        <g key={it.name} transform={`translate(6 ${14 + i * 18})`}>
          {it.swatch}
          <text x="34" y="0" fontSize={FONT} dominantBaseline="central" className="fill-ink">
            {it.name}
          </text>
        </g>
      ))}
    </g>
  );
}
