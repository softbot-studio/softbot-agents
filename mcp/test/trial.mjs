import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const t = new StdioClientTransport({ command: "node", args: ["dist/index.js"], env: { ...process.env } });
const c = new Client({ name: "t", version: "0" }); await c.connect(t);
for (let i = 1; i <= 4; i++) { const r = await c.callTool({ name: "check_domain", arguments: { domain: "github.com" } });
  const txt = r.content[0].text; let j; try { j = JSON.parse(txt); } catch {}
  console.log(i, "isError", !!r.isError, JSON.stringify({ status: j?.status, free_trial: j?.free_trial, trial_remaining: j?.trial_remaining, paid: j?.paid_usdc, err: j?.error ? String(JSON.stringify(j.error)).slice(0,150) : (j ? undefined : txt.slice(0,150)) })); }
await c.close();
