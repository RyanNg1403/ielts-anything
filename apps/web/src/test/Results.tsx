import { ScoreSummary } from "../components/ScoreSummary.tsx";
import type { ListeningPayload, ReadingPayload } from "../data.ts";
import { exitTest, go } from "../router.ts";

export function Results({ data }: { data: ReadingPayload | ListeningPayload }) {
  const { test, attempt } = data;
  const result = attempt!.result;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <header className="flex h-14 items-center border-b border-rule bg-surface px-4">
        <button
          onClick={() => exitTest(data.conversationId ? { name: "chat", id: data.conversationId } : { name: "tests" })}
          className="rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-paper hover:text-ink"
        >
          Back
        </button>
      </header>
      <main className="mx-auto max-w-[640px] px-6 py-12">
        <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink">{test.title}</h1>
        <div className="mt-8 rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)] p-6">
          <ScoreSummary test={test} result={result} elapsedSec={attempt!.elapsed_sec} onPick={(q) => go({ name: "test", id: data.id, review: true, q, part: null })} />
        </div>
        {data.kind === "listening" && (
          <button
            onClick={() => go({ name: "test", id: data.id, review: true, q: null, part: null })}
            className="mt-4 rounded-lg border border-rule-strong bg-surface px-4 py-2 text-sm text-ink hover:bg-paper"
          >
            Review with the transcript and audio
          </button>
        )}
      </main>
    </div>
  );
}
