// Prints what the logged-in Codex account offers (image generation, web search).
import { CodexAppServer } from "../../apps/server/src/codex/app-server.ts";
import { CODEX_HOME, ensureCodexHome } from "../../apps/server/src/codex/home.ts";
ensureCodexHome();
const codex = new CodexAppServer({ codexHome: CODEX_HOME });
await codex.start();
console.log(JSON.stringify(await codex.request("modelProvider/capabilities/read", {})));
process.exit(0);
