// Usage: node test/smoke.mjs [paid]   (key via SOLANA_PRIVATE_KEY env; never printed)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const env = { ...process.env }; 
const t = new StdioClientTransport({ command: "node", args: ["dist/index.js"], env });
const c = new Client({ name: "smoke", version: "0" }); await c.connect(t);
const { tools } = await c.listTools();
for (const x of tools) console.log("TOOL", x.name, "|", x.description.match(/Price: [^ ]+/)?.[0] ?? "free");
const samples = { read_url:{url:"https://example.com"}, extract_structured:{url:"https://example.com"}, check_solana_token:{mint:"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}, check_email:{email:"a@example.com"}, check_domain:{domain:"github.com"}, check_wallet:{address:"9csHbkGGeQqNxvtZw8hPnC34NCcmZoZXVTEGC1MiDNRE"}, check_website:{url:"github.com"}, screenshot_url:{url:"https://example.com"}, page_to_pdf:{url:"https://example.com"} };
for (const [n,a] of Object.entries(samples)) { const r = await c.callTool({ name:n, arguments:{...a, dry_run:true} }); const j=JSON.parse(r.content[0].text); console.log("DRY", n, j.price_usdc, j.endpoint, "fits:", j.would_fit_budget); }
if (process.argv[2]==="paid") {
  const r = await c.callTool({ name:"check_domain", arguments:{ domain:"github.com" } });
  console.log("PAID isError:", !!r.isError); console.log(r.content[0].text.slice(0,1500));
  const s = await c.callTool({ name:"softbot_status", arguments:{} }); console.log(s.content[0].text);
  // budget guard test: tiny budget handled via separate run
}
await c.close();
