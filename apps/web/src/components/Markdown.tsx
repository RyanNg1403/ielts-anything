import { Fragment, type ReactNode } from "react";

/** Minimal markdown for chat replies: paragraphs, bullet/numbered lists, **bold**, *italic*, `code`. */
export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="max-w-none space-y-3.5 text-[16px] leading-[1.7] text-ink">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 marker:text-ink-faint">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*] /, ""))}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\s*\d+[.)] /.test(l)))
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5 marker:text-ink-faint">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+[.)] /, ""))}</li>
              ))}
            </ol>
          );
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link)
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
          {link[1]}
        </a>
      );
    if (p.startsWith("`") && p.endsWith("`"))
      return (
        <code key={i} className="rounded bg-paper px-1 py-0.5 text-[13px]">
          {p.slice(1, -1)}
        </code>
      );
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}
