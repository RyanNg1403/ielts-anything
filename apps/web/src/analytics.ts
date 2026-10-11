import { FAMILY_LABELS, type ReadingResult, type ReadingTest } from "@ielts/spec";

export type Breakdown = {
  parts: { title: string; correct: number; total: number }[];
  families: { family: string; label: string; correct: number; total: number }[];
  weakest: { family: string; label: string; correct: number; total: number } | null;
  missed: number[];
};

export function breakdown(test: ReadingTest, result: ReadingResult): Breakdown {
  const parts = test.passages.map((p) => ({ title: p.title, correct: 0, total: 0 }));
  const fam = new Map<string, { correct: number; total: number }>();
  for (const i of result.items) {
    const part = parts[i.key.passage - 1];
    if (part) {
      part.total += 1;
      if (i.correct) part.correct += 1;
    }
    const f = fam.get(i.key.family) ?? { correct: 0, total: 0 };
    f.total += 1;
    if (i.correct) f.correct += 1;
    fam.set(i.key.family, f);
  }
  const families = [...fam.entries()]
    .map(([family, v]) => ({ family, label: FAMILY_LABELS[family as keyof typeof FAMILY_LABELS] ?? family, ...v }))
    .sort((a, b) => a.correct / a.total - b.correct / b.total);
  const weakest = families.find((f) => f.correct < f.total) ?? null;
  return { parts, families, weakest, missed: result.items.filter((i) => !i.correct).map((i) => i.q) };
}

export const pct = (c: number, t: number) => (t ? Math.round((c / t) * 100) : 0);

export function formatDuration(sec: number | null | undefined) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  return m >= 1 ? `${m} min` : `${sec} s`;
}
