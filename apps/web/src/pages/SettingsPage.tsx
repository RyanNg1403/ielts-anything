import { useResource } from "../data.ts";
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
      </div>
    </div>
  );
}
