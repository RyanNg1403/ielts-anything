import { Fragment, type ReactNode } from "react";
import { PARAGRAPH_LABELS, ROMAN, instructionsFor, type MarkedItem, type Passage, type QuestionBlock } from "@ielts/spec";

export type Review = Map<number, MarkedItem>;

type Props = {
  passage: Passage;
  number: number;
  responses: Record<string, string>;
  onAnswer: (q: number, value: string) => void;
  current: number | null;
  onFocusQ: (q: number) => void;
  flagged: Set<number>;
  onToggleFlag: (q: number) => void;
  review: Review | null;
  onShowEvidence: (q: number) => void;
  onAskTutor: (q: number) => void;
};

export function QuestionsView(props: Props) {
  const { passage, number } = props;
  return (
    <div className="space-y-10 px-6 py-8 sm:px-8">
      {passage.blocks.map((b, i) => (
        <Block key={i} block={b} {...props} instructions={instructionsFor(b, passage, number)} paragraphs={passage.paragraphs.length} />
      ))}
    </div>
  );
}

function Block(props: Props & { block: QuestionBlock; instructions: ReturnType<typeof instructionsFor>; paragraphs: number }) {
  const { block: b, instructions: ins } = props;
  return (
    <section>
      <h3 className="text-[15px] font-semibold text-ink">{ins.heading}</h3>
      <div className="mt-1.5 space-y-1 text-[15px] text-ink-soft">
        {ins.lines.map((l, i) => (
          <p key={i}>{emphasise(l)}</p>
        ))}
        {ins.legend && (
          <table className="mt-1 text-[14px]">
            <tbody>
              {ins.legend.map((l) => (
                <tr key={l.label}>
                  <td className="pr-4 align-top font-semibold text-ink">{l.label}</td>
                  <td>{l.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {ins.note && <p className="font-medium text-ink">{ins.note}</p>}
      </div>
      <div className="mt-4">
        <BlockBody {...props} />
      </div>
    </section>
  );
}

/** Capitalised instruction words (TWO, ONE WORD ONLY) are bold, as on the paper. */
function emphasise(line: string): ReactNode {
  const parts = line.split(/(\b(?:[A-Z]{2,}(?:\s+[A-Z]{2,}|\/[A-Z]+)*)\b)/g);
  return parts.map((p, i) => (/^[A-Z]{2,}/.test(p) && p !== "A" ? <strong key={i} className="font-semibold text-ink">{p}</strong> : <Fragment key={i}>{p}</Fragment>));
}

function BlockBody(props: Props & { block: QuestionBlock; paragraphs: number }) {
  const { block: b } = props;
  switch (b.family) {
    case "tfng":
    case "ynng": {
      const labels = b.family === "tfng" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"];
      return (
        <div className="space-y-3">
          {b.items.map((it) => (
            <Item key={it.q} q={it.q} {...props}>
              <p className="text-[15px] text-ink">{it.statement}</p>
              <Choice q={it.q} options={labels.map((l) => ({ value: l, label: l }))} {...props} compact />
            </Item>
          ))}
        </div>
      );
    }
    case "mcq":
      return (
        <div className="space-y-5">
          {b.items.map((it) => (
            <Item key={it.q} q={it.q} {...props}>
              <p className="text-[15px] text-ink">{it.stem}</p>
              <Choice q={it.q} options={it.options.map((o) => ({ value: o.letter, label: o.text, letter: o.letter }))} {...props} />
            </Item>
          ))}
        </div>
      );
    case "mcq_multi":
      return <MultiChoice {...props} block={b} />;
    case "matching_information":
      return (
        <div className="space-y-2.5">
          {b.items.map((it) => (
            <Item key={it.q} q={it.q} {...props} inline>
              <span className="flex-1 text-[15px] text-ink">{it.prompt}</span>
              <Select q={it.q} options={PARAGRAPH_LABELS.slice(0, props.paragraphs)} {...props} />
            </Item>
          ))}
        </div>
      );
    case "matching_headings":
      return (
        <div>
          <OptionBank title="List of Headings" options={b.headings.map((h, i) => ({ letter: ROMAN[i]!, text: h }))} />
          <div className="mt-4 space-y-2.5">
            {b.items.map((it) => (
              <Item key={it.q} q={it.q} {...props} inline>
                <span className="flex-1 text-[15px] text-ink">Paragraph {it.paragraph}</span>
                <Select q={it.q} options={ROMAN.slice(0, b.headings.length)} {...props} />
              </Item>
            ))}
          </div>
        </div>
      );
    case "matching_features":
      return (
        <div>
          <div className="space-y-2.5">
            {b.items.map((it) => (
              <Item key={it.q} q={it.q} {...props} inline>
                <span className="flex-1 text-[15px] text-ink">{it.prompt}</span>
                <Select q={it.q} options={b.options.map((o) => o.letter)} {...props} />
              </Item>
            ))}
          </div>
          <OptionBank title={`List of ${b.featureLabel}`} options={b.options} className="mt-4" />
        </div>
      );
    case "sentence_endings":
      return (
        <div>
          <div className="space-y-2.5">
            {b.items.map((it) => (
              <Item key={it.q} q={it.q} {...props} inline>
                <span className="flex-1 text-[15px] text-ink">{it.beginning}</span>
                <Select q={it.q} options={b.endings.map((o) => o.letter)} {...props} />
              </Item>
            ))}
          </div>
          <OptionBank options={b.endings} className="mt-4" />
        </div>
      );
    case "sentence_completion":
      return (
        <div className="space-y-3">
          {b.items.map((it) => (
            <Item key={it.q} q={it.q} {...props}>
              <p className="text-[15px] leading-8 text-ink">
                {it.sentence.split("____").map((part, i, arr) => (
                  <Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && <Gap q={it.q} {...props} />}
                  </Fragment>
                ))}
              </p>
            </Item>
          ))}
        </div>
      );
    case "short_answer":
      return (
        <div className="space-y-3">
          {b.items.map((it) => (
            <Item key={it.q} q={it.q} {...props}>
              <p className="text-[15px] text-ink">{it.question}</p>
              <Gap {...props} q={it.q} wide />
            </Item>
          ))}
        </div>
      );
    case "summary_completion":
    case "summary_bank":
      return (
        <div>
          <div className="rounded-lg border border-rule bg-surface px-5 py-4">
            {b.title && <p className="mb-2 text-center font-semibold text-ink">{b.title}</p>}
            <p className="text-[15px] leading-9 text-ink">
              <WithGaps text={b.text} {...props} select={b.family === "summary_bank" ? b.options.map((o) => o.letter) : undefined} />
            </p>
          </div>
          {b.family === "summary_bank" && <OptionBank options={b.options} className="mt-4" columns />}
          <ReviewList qs={b.items.map((i) => i.q)} {...props} />
        </div>
      );
    case "note_completion":
      return (
        <div>
          <div className="rounded-lg border border-rule bg-surface px-5 py-4">
            <p className="mb-2 text-center font-semibold text-ink">{b.title}</p>
            {b.notes.map((n, i) => (
              <div key={i} className="mt-2">
                {n.heading && <p className="font-semibold text-ink">{<WithGaps text={n.heading} {...props} />}</p>}
                <ul className="list-disc space-y-1 pl-5 text-[15px] leading-8 text-ink marker:text-ink-faint">
                  {n.lines.map((l, k) => (
                    <li key={k}>
                      <WithGaps text={l} {...props} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <ReviewList qs={b.items.map((i) => i.q)} {...props} />
        </div>
      );
    case "table_completion":
      return (
        <div>
          {b.title && <p className="mb-2 text-center font-semibold text-ink">{b.title}</p>}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px] text-ink">
              <thead>
                <tr>
                  {b.header.map((h, i) => (
                    <th key={i} className="border border-rule-strong bg-paper px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((cell, k) => (
                      <td key={k} className="border border-rule-strong bg-surface px-3 py-2 align-top leading-8">
                        <WithGaps text={cell} {...props} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ReviewList qs={b.items.map((i) => i.q)} {...props} />
        </div>
      );
    case "flowchart_completion":
      return (
        <div>
          {b.title && <p className="mb-2 text-center font-semibold text-ink">{b.title}</p>}
          <div className="flex flex-col items-center">
            {b.steps.map((s, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="py-1 text-ink-faint" aria-hidden>↓</span>}
                <div className="w-full max-w-md rounded-lg border border-rule-strong bg-surface px-4 py-2 text-center text-[15px] leading-8 text-ink">
                  <WithGaps text={s} {...props} />
                </div>
              </Fragment>
            ))}
          </div>
          <ReviewList qs={b.items.map((i) => i.q)} {...props} />
        </div>
      );
  }
}

/* ---------- building blocks ---------- */

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%234a5874' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

function Item({ q, children, inline, ...p }: Props & { q: number; children: ReactNode; inline?: boolean }) {
  const r = p.review?.get(q);
  const active = p.current === q;
  return (
    <div
      id={`q-${q}`}
      onFocusCapture={() => p.onFocusQ(q)}
      onClick={() => p.onFocusQ(q)}
      className={`group relative rounded-lg border px-3 py-2.5 transition-colors ${
        r ? (r.correct ? (active ? "border-rule bg-surface" : "border-transparent") : "border-wrong-line bg-wrong-wash") : active ? "border-rule bg-surface shadow-[var(--shadow-card)]" : "border-transparent"
      }`}
    >
      <div className={inline ? "flex items-center gap-3" : "flex gap-3"}>
        <QNumber q={q} {...p} />
        <div className={inline ? "flex flex-1 items-center gap-3" : "flex-1 space-y-2.5"}>{children}</div>
      </div>
      {r && active && <ReviewDetail item={r} {...p} />}
    </div>
  );
}

function QNumber(p: Props & { q: number }) {
  const { q, flagged, onToggleFlag, review } = p;
  const r = review?.get(q);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!review) onToggleFlag(q);
      }}
      title={review ? undefined : flagged.has(q) ? "Remove flag" : "Flag for review"}
      className={`relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
        r ? (r.correct ? "bg-correct-wash text-reading" : "bg-wrong-fill text-danger") : (p.responses[q] ?? "").trim() ? "bg-primary text-on-primary" : "border border-rule-strong bg-surface text-ink"
      }`}
    >
      {q}
      {!review && flagged.has(q) && <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-writing ring-2 ring-surface" aria-label="Flagged" />}
    </button>
  );
}

function ReviewDetail({ item, onShowEvidence, onAskTutor }: Props & { item: MarkedItem }) {
  return (
    <div className="mt-3 border-t border-rule pt-3 pl-10 text-[14px]">
      <p className="text-ink">
        {item.correct ? "Correct." : item.given ? <>You wrote <s className="text-danger">{item.given}</s>. </> : "No answer. "}
        {!item.correct && (
          <>
            Answer: <strong>{item.key.display}</strong>
          </>
        )}
      </p>
      {item.key.explanation && <p className="mt-1 leading-relaxed text-ink-soft">{item.key.explanation}</p>}
    </div>
  );
}

/** Completion layouts put inputs inline, so their review details are listed under the block. */
function ReviewList({ qs, ...p }: Props & { qs: number[] }) {
  if (!p.review) return null;
  const active = qs.find((q) => q === p.current);
  const item = active ? p.review.get(active) : null;
  return item ? (
    <div className="mt-3 rounded-lg border border-rule bg-surface px-3 py-2">
      <p className="pl-10 text-sm font-semibold text-ink">Question {item.q}</p>
      <ReviewDetail item={item} {...p} />
    </div>
  ) : null;
}

function Choice({ q, options, compact, responses, onAnswer, review }: Props & { q: number; options: { value: string; label: string; letter?: string }[]; compact?: boolean }) {
  const value = responses[q] ?? "";
  const r = review?.get(q);
  return (
    <div role="radiogroup" aria-label={`Question ${q}`} className={compact ? "flex flex-wrap gap-2" : "space-y-1.5"}>
      {options.map((o) => {
        const on = value === o.value;
        const isKey = r && r.key.accept.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={!!review}
            onClick={() => onAnswer(q, on ? "" : o.value)}
            className={`flex items-start gap-2.5 rounded-md border text-left text-[14px] transition-colors ${compact ? "px-3 py-1.5 font-medium" : "w-full px-3 py-2"} ${
              isKey
                ? "border-reading bg-reading-wash text-ink"
                : on
                  ? review
                    ? "border-danger bg-wrong-fill text-ink"
                    : "border-primary bg-selected text-ink ring-1 ring-primary"
                  : "border-rule bg-surface text-ink hover:border-rule-strong"
            }`}
          >
            {o.letter && <span className="w-4 shrink-0 font-semibold">{o.letter}</span>}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MultiChoice(props: Props & { block: Extract<QuestionBlock, { family: "mcq_multi" }> }) {
  const { block: b, responses, onAnswer, review } = props;
  const chosen = b.qs.map((q) => responses[q]).filter(Boolean) as string[];
  const toggle = (letter: string) => {
    let next = chosen.includes(letter) ? chosen.filter((l) => l !== letter) : [...chosen, letter];
    if (next.length > b.qs.length) next = next.slice(1);
    next.sort();
    b.qs.forEach((q, i) => onAnswer(q, next[i] ?? ""));
  };
  const keys = review ? new Set(review.get(b.qs[0]!)?.key.accept ?? []) : null;
  return (
    <Item q={b.qs[0]!} {...props}>
      <p className="text-[15px] text-ink">
        <span className="mr-1 font-semibold">{b.qs.join(" and ")}.</span> {b.stem}
      </p>
      <div className="space-y-1.5">
        {b.options.map((o) => {
          const on = chosen.includes(o.letter);
          const isKey = keys?.has(o.letter);
          return (
            <button
              key={o.letter}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={!!review}
              onClick={() => toggle(o.letter)}
              className={`flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left text-[14px] ${
                isKey ? "border-reading bg-reading-wash" : on ? (review ? "border-danger bg-wrong-fill" : "border-primary bg-selected ring-1 ring-primary") : "border-rule bg-surface hover:border-rule-strong"
              }`}
            >
              <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${on ? "border-primary bg-primary text-on-primary" : "border-rule-strong"}`}>
                {on && (
                  <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                    <path d="M2.5 6.5l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </span>
              <span className="w-4 shrink-0 font-semibold">{o.letter}</span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
    </Item>
  );
}

function Select({ q, options, responses, onAnswer, review, onFocusQ }: Props & { q: number; options: string[] }) {
  const r = review?.get(q);
  return (
    <span className="flex items-center gap-2">
      <select
        aria-label={`Answer to question ${q}`}
        value={responses[q] ?? ""}
        disabled={!!review}
        onFocus={() => onFocusQ(q)}
        onChange={(e) => onAnswer(q, e.target.value)}
        className={`h-9 min-w-[4.5rem] appearance-none rounded-md border bg-surface bg-[length:12px] bg-[position:right_0.65rem_center] bg-no-repeat pr-8 pl-3 text-[14px] font-semibold ${r ? (r.correct ? "border-reading" : "border-danger text-danger") : "border-rule-strong"}`}
        style={{ backgroundImage: CHEVRON }}
      >
        <option value="" />
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {r && !r.correct && <span className="text-[14px] font-semibold text-reading">{r.key.display}</span>}
    </span>
  );
}

function Gap({ q, responses, onAnswer, review, onFocusQ, current, wide }: Props & { q: number; wide?: boolean }) {
  const r = review?.get(q);
  const value = responses[q] ?? "";
  if (r) {
    return (
      <span
        onClick={() => onFocusQ(q)}
        className={`mx-1 inline-flex cursor-pointer items-baseline gap-1.5 rounded border px-2 py-0.5 ${r.correct ? "border-reading bg-reading-wash" : "border-danger bg-wrong-fill"} ${current === q ? "ring-2 ring-primary/40" : ""}`}
      >
        <span className="text-[12px] font-semibold text-ink-soft">{q}</span>
        {r.correct ? <span>{value}</span> : <><s className="text-danger">{value || "—"}</s><span className="font-semibold text-reading">{r.key.display}</span></>}
      </span>
    );
  }
  return (
    <span className={`${wide ? "flex" : "mx-1 inline-flex"} items-center`}>
      <input
        id={`gap-${q}`}
        aria-label={`Answer to question ${q}`}
        value={value}
        onFocus={() => onFocusQ(q)}
        onChange={(e) => onAnswer(q, e.target.value)}
        placeholder={String(q)}
        autoComplete="off"
        spellCheck={false}
        className={`h-8 rounded-md border bg-surface px-2 text-center text-[14px] font-medium text-ink placeholder:font-semibold placeholder:text-ink-faint focus:border-primary focus:outline-none ${
          wide ? "w-full max-w-xs text-left" : "w-36"
        } ${current === q ? "border-primary" : "border-rule-strong"}`}
      />
    </span>
  );
}

function WithGaps({ text, select, ...p }: Props & { text: string; select?: string[] }) {
  const parts = text.split(/(\{\{\d+\}\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{\{(\d+)\}\}$/);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        const q = Number(m[1]);
        return select ? (
          <span key={i} className="mx-1 inline-flex items-center gap-1 align-middle">
            <span className="text-[12px] font-semibold text-ink-soft">{q}</span>
            <Select q={q} options={select} {...p} />
          </span>
        ) : (
          <Gap key={i} q={q} {...p} />
        );
      })}
    </>
  );
}

function OptionBank({ title, options, className = "", columns }: { title?: string; options: { letter: string; text: string }[]; className?: string; columns?: boolean }) {
  return (
    <div className={`rounded-lg border border-rule bg-surface px-4 py-3 ${className}`}>
      {title && <p className="mb-2 font-semibold text-ink">{title}</p>}
      <dl className={`text-[14px] ${columns ? "grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2" : "space-y-1"}`}>
        {options.map((o) => (
          <div key={o.letter} className="flex gap-3">
            <dt className="w-6 shrink-0 font-semibold text-ink">{o.letter}</dt>
            <dd className="text-ink">{o.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
