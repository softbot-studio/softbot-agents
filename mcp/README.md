# softbot-mcp

MCP server for [Softbot Studio](https://softbot-studio.pages.dev/) pay-per-call agent tools. Each call is paid with **USDC on Solana mainnet** through x402, straight from your own wallet. There are no accounts or API keys, and failed calls are free.

| Tool | What it does | Price (USDC) |
|---|---|---|
| `read_url` | Page to clean markdown + metadata | 0.003 |
| `extract_structured` | Tables, JSON-LD, contacts, links, CSS-selector fields | 0.004 |
| `check_solana_token` | Token safety verdict (safe/caution/avoid) | 0.01 |
| `check_email` | Email deliverability / disposable / typo check | 0.002 |
| `check_domain` | Mail domain check (MX, SPF/DMARC/DKIM, age) | 0.002 |
| `check_wallet` | Solana wallet profile + OFAC match | 0.005 |
| `check_website` | Website trust / phishing / lookalike check | 0.003 |
| `screenshot_url` | Page screenshot (returned as an MCP image) | 0.01 |
| `page_to_pdf` | Page as A4 PDF (embedded resource) | 0.01 |
| `softbot_status` | Session spend, budget, wallet (free) | 0 |

Every paid tool accepts `dry_run: true`, which returns the price and endpoint without paying.

## Configuration (env vars)

- `SOLANA_PRIVATE_KEY` (required for paid calls) is the keypair of a wallet holding a little USDC (no SOL needed, since the facilitator pays network fees). It takes base58, or the JSON byte array from `solana-keygen`. **Use a dedicated low-balance wallet.**
- `MAX_SPEND_USDC` is the per-session budget. It defaults to `0.25`, and calls that would exceed it are refused.
- `SOFTBOT_DRY_RUN=1` puts every tool in price-only mode.
- `SOLANA_RPC_URL` is optional and defaults to the public mainnet RPC.

## Claude Desktop

`claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "softbot": {
      "command": "npx",
      "args": ["-y", "softbot-mcp"],
      "env": { "SOLANA_PRIVATE_KEY": "<base58 or [..] key>", "MAX_SPEND_USDC": "0.25" }
    }
  }
}
```

## Cursor

`~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):
```json
{
  "mcpServers": {
    "softbot": {
      "command": "npx",
      "args": ["-y", "softbot-mcp"],
      "env": { "SOLANA_PRIVATE_KEY": "<base58 or [..] key>", "MAX_SPEND_USDC": "0.25" }
    }
  }
}
```

## Safety
- The key is used only locally to sign x402 USDC transfers, and it is never logged or sent anywhere.
- The client refuses to pay if a server asks for more than the advertised price, or for an asset other than USDC.
- The budget resets when the server process restarts.

## Develop
```
npm install && npm run build
node test/smoke.mjs          # list tools + dry run each
SOLANA_PRIVATE_KEY=... node test/smoke.mjs paid   # one $0.002 check_domain call
```

MIT licensed.
