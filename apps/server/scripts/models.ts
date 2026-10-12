// Prints the model catalog the learner's Codex account offers.
import { CodexAppServer } from "../src/codex/app-server.ts";
import { CODEX_HOME, ensureCodexHome } from "../src/codex/home.ts";
ensureCodexHome();
const codex = new CodexAppServer({ codexHome: CODEX_HOME } as any);
await codex.start();
const r: any = await codex.request("model/list", {});
for (const m of r.data) console.log(JSON.stringify({ id: m.id, name: m.displayName, hidden: m.hidden, def: m.isDefault, efforts: m.supportedReasoningEfforts.map((e: any) => e.reasoningEffort), defEffort: m.defaultReasoningEffort, tiers: m.serviceTiers, defTier: m.defaultServiceTier }));
codex.stop();
process.exit(0);
