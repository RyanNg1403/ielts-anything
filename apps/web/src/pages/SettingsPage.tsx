import { useState } from "react";
import { saveSettings, useResource, useSettings } from "../data.ts";
import { useTheme, type ThemePref } from "../theme.ts";

type Status = { codexRunning: boolean; loggedIn: boolean; account: { account?: { email?: string; planType?: string } } | null };

export function SettingsPage() {
  const { data } = useResource<Status>("/api/status");
  const acct = data?.account?.account;
  const [theme, setTheme] = useTheme();
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[680px] px-4 py-10 sm:px-8">
        <h1 className="font-serif text-[28px] font-semibold text-ink">Settings</h1>
        <section className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)] p-5">
          <h2 className="text-[15px] font-semibold text-ink">Appearance</h2>
          <div role="radiogroup" aria-label="Appearance" className="flex rounded-lg bg-paper p-0.5 text-sm">
            {(["system", "light", "dark"] as ThemePref[]).map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={theme === t}
                onClick={() => setTheme(t)}
                className={`rounded-md px-3 py-1.5 capitalize ${theme === t ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
        <section className="mt-4 rounded-2xl border border-rule bg-surface shadow-[var(--shadow-card)] p-5">
          <h2 className="text-[15px] font-semibold text-ink">Codex</h2>
          {!data ? (
            <p className="mt-2 text-sm text-ink-soft">Checking…</p>
          ) : data.codexRunning && acct ? (
            <p className="mt-2 text-sm text-ink-soft">
              Signed in as <span className="text-ink">{acct.email}</span>
              {acct.planType && <> on the {acct.planType[0]!.toUpperCase() + acct.planType.slice(1)} plan</>}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-danger">
              Codex isn't signed in. Run <code className="rounded bg-paper px-1">codex login</code> in a terminal, then restart the app.
            </p>
          )}
        </section>
        <ListeningVoices />
      </div>
    </div>
  );
}

/** Which voices record Listening tests: Kokoro on this computer (free), or OpenAI with the learner's key (paid). */
function ListeningVoices() {
  const { data } = useSettings();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (patch: Parameters<typeof saveSettings>[0]) => {
    setBusy(true);
    setError(null);
    try {
      await saveSettings(patch);
      setKey("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const options = [
    { value: "kokoro", label: "Kokoro", hint: "Free, runs on this computer. British and American voices. The first test downloads a 90 MB voice model." },
    { value: "openai", label: "OpenAI", hint: "Paid, uses your OpenAI API key (roughly 40 cents for a full test). More natural voices, adds Australian and New Zealand accents." },
  ] as const;
  return (
    <section className="mt-4 rounded-2xl border border-rule bg-surface p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-[15px] font-semibold text-ink">Listening voices</h2>
      <p className="mt-1 text-sm text-ink-soft">Used when a new Listening test is recorded. Tests already recorded keep their voices.</p>
      {data && (
        <>
          <div role="radiogroup" aria-label="Listening voices" className="mt-4 grid gap-3 sm:grid-cols-2">
            {options.map((o) => {
              const on = data.listeningVoices === o.value;
              const blocked = o.value === "openai" && !data.openaiKeySet;
              return (
                <button
                  key={o.value}
                  role="radio"
                  aria-checked={on}
                  disabled={busy || blocked}
                  title={blocked ? "Add your OpenAI API key below first" : undefined}
                  onClick={() => run({ listeningVoices: o.value })}
                  className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed ${on ? "border-primary bg-selected ring-1 ring-primary" : "border-rule hover:border-rule-strong"} ${blocked ? "opacity-60" : ""}`}
                >
                  <span className="block text-[15px] font-semibold text-ink">{o.label}</span>
                  <span className="mt-1 block text-[13px] text-ink-soft">{o.hint}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5">
            <label htmlFor="openai-key" className="text-[14px] font-medium text-ink">
              OpenAI API key
            </label>
            {data.openaiKeySet ? (
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className="font-mono text-ink-soft">{data.openaiKeyHint}</span>
                <button disabled={busy} onClick={() => run({ openaiKey: null })} className="rounded-md px-2 py-1 text-ink-soft hover:bg-paper hover:text-ink">
                  Remove
                </button>
              </div>
            ) : (
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (key.trim()) run({ openaiKey: key.trim(), listeningVoices: "openai" });
                }}
              >
                <input
                  id="openai-key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="sk-…"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-rule-strong bg-surface px-3 font-mono text-sm text-ink focus:border-primary focus:outline-none"
                />
                <button disabled={busy || !key.trim()} className="rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-50">
                  {busy ? "Checking…" : "Save"}
                </button>
              </form>
            )}
            <p className="mt-2 text-[13px] text-ink-faint">Stored only on this computer and used only to record Listening audio.</p>
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </>
      )}
    </section>
  );
}
