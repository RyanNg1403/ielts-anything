import { useEffect, useRef, type MouseEvent } from "react";
import { PARAGRAPH_LABELS, normalize, passageUsesParagraphLetters, type Passage as P } from "@ielts/spec";

export type Highlight = { para: number; start: number; end: number };

type Segment = { text: string; mark: "none" | "user" | "evidence"; hl?: number };

/** Split a paragraph into plain, learner-highlighted and evidence segments. */
function segments(text: string, highlights: { start: number; end: number; i: number }[], evidence: { start: number; end: number } | null): Segment[] {
  const cuts = new Set([0, text.length]);
  for (const h of highlights) cuts.add(h.start).add(h.end);
  if (evidence) cuts.add(evidence.start).add(evidence.end);
  const points = [...cuts].filter((n) => n >= 0 && n <= text.length).sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let k = 0; k < points.length - 1; k++) {
    const a = points[k]!;
    const b = points[k + 1]!;
    if (a === b) continue;
    const inEvidence = evidence && a >= evidence.start && b <= evidence.end;
    const hl = highlights.find((h) => a >= h.start && b <= h.end);
    out.push({ text: text.slice(a, b), mark: inEvidence ? "evidence" : hl ? "user" : "none", hl: hl?.i });
  }
  return out;
}

/** Find an evidence quote inside a paragraph, tolerant of quote marks and spacing. */
export function findEvidence(paragraphs: string[], quote: string): { para: number; start: number; end: number } | null {
  if (!quote.trim()) return null;
  const words = normalize(quote).replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const pattern = new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^a-z0-9']+"), "i");
  for (let i = 0; i < paragraphs.length; i++) {
    const m = pattern.exec(paragraphs[i]!.replace(/[‘’]/g, "'"));
    if (m) return { para: i, start: m.index, end: m.index + m[0].length };
  }
  return null;
}

export function PassageView({
  passage,
  number,
  highlights,
  onHighlightsChange,
  evidence,
}: {
  passage: P;
  number: number;
  highlights: Highlight[];
  onHighlightsChange: (h: Highlight[]) => void;
  evidence: { para: number; start: number; end: number } | null;
}) {
  const letters = passageUsesParagraphLetters(passage);
  const root = useRef<HTMLDivElement>(null);
  const evidenceRef = useRef<HTMLElement>(null);

  useEffect(() => {
    evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [evidence]);

  const onMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !root.current) return;
    const range = sel.getRangeAt(0);
    const startPara = (range.startContainer.parentElement?.closest("[data-para]") as HTMLElement | null) ?? null;
    const endPara = (range.endContainer.parentElement?.closest("[data-para]") as HTMLElement | null) ?? null;
    if (!startPara || startPara !== endPara || !root.current.contains(startPara)) return;
    const para = Number(startPara.dataset.para);
    const offset = (node: Node, local: number) => {
      const walker = document.createTreeWalker(startPara, NodeFilter.SHOW_TEXT);
      let total = 0;
      while (walker.nextNode()) {
        if (walker.currentNode === node) return total + local;
        total += walker.currentNode.textContent?.length ?? 0;
      }
      return total;
    };
    const start = offset(range.startContainer, range.startOffset);
    const end = offset(range.endContainer, range.endOffset);
    if (end - start < 2) return;
    sel.removeAllRanges();
    onHighlightsChange([...highlights.filter((h) => h.para !== para || h.end <= start || h.start >= end), { para, start, end }]);
  };

  const removeHighlight = (e: MouseEvent, i: number) => {
    e.stopPropagation();
    onHighlightsChange(highlights.filter((_, k) => k !== i));
  };

  return (
    <article ref={root} onMouseUp={onMouseUp} className="mx-auto max-w-[68ch] px-6 py-8 sm:px-10">
      <h2 className="font-serif text-[26px] font-semibold leading-tight text-ink">{passage.title}</h2>
      {passage.subtitle && <p className="mt-2 font-serif text-[17px] italic leading-relaxed text-ink-soft">{passage.subtitle}</p>}
      {passage.image && (
        <figure className="mt-6 overflow-hidden rounded-md bg-white p-2">
          <img src={`/api/figures/${passage.image}`} alt="" className="mx-auto block max-h-80 max-w-full" />
        </figure>
      )}
      <div className="mt-6 space-y-4 font-serif text-[17px] leading-[1.75] text-ink">
        {passage.paragraphs.map((text, i) => {
          const hs = highlights.map((h, k) => ({ ...h, i: k })).filter((h) => h.para === i);
          const ev = evidence && evidence.para === i ? evidence : null;
          return (
            <p key={i} className={letters ? "relative pl-8" : undefined}>
              {letters && <span className="absolute left-0 font-sans text-[15px] font-semibold text-ink">{PARAGRAPH_LABELS[i]}</span>}
              <span data-para={i}>
                {segments(text, hs, ev).map((s, k) =>
                  s.mark === "evidence" ? (
                    <mark key={k} ref={evidenceRef} className="rounded-sm bg-highlight px-0.5 text-ink">
                      {s.text}
                    </mark>
                  ) : s.mark === "user" ? (
                    <mark key={k} onClick={(e) => removeHighlight(e, s.hl!)} className="cursor-pointer bg-user-highlight text-ink" title="Remove highlight">
                      {s.text}
                    </mark>
                  ) : (
                    <span key={k}>{s.text}</span>
                  ),
                )}
              </span>
            </p>
          );
        })}
      </div>
      {passage.glossary.length > 0 && (
        <dl className="mt-6 space-y-1 border-t border-rule pt-4 text-sm text-ink-soft">
          {passage.glossary.map((g) => (
            <div key={g.term}>
              <dt className="inline font-medium text-ink">*{g.term}: </dt>
              <dd className="inline">{g.definition}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
