---
name: softbot-tools
description: Use Softbot Studio's pay-per-call agent tools through the softbot-mcp MCP server. Use when you need clean markdown or structured data (tables, JSON-LD, contacts) from a public web page, a screenshot or PDF of a page, an email address or mail-domain check, a trust check of an unfamiliar website or link, or a safety check of a Solana token or wallet before trading, paying or recommending it. These are paid HTTP APIs (x402) hosted by Softbot Studio; after a free trial of 3 calls per tool, each call spends a small amount of USDC from the user's own Solana wallet.
---

# Softbot tools (softbot-mcp)

Softbot Studio runs a set of small web and crypto-safety APIs for AI agents. The `softbot-mcp` MCP server (npm package `softbot-mcp`, MCP registry name `io.github.softbot-studio/softbot-mcp`) exposes them as MCP tools. This skill tells you when to use them, how to set them up, and how to handle money safely.

## What you must know first (disclosure)

- **These are paid, remote services.** Every tool call sends your input (a URL, email address, domain, token mint or wallet address) over HTTPS to a Softbot Studio server on `*.softbot.workers.dev`. Do not send anything the user would not want shared with a third party.
- **Payment is real money.** Calls are paid with the x402 protocol in **USDC on Solana mainnet**, signed by the wallet whose key is in `SOLANA_PRIVATE_KEY`. Prices are $0.002 to $0.01 per call (see the table below).
- **Free trial.** The first 3 successful calls of each tool are free per wallet. The server proves the wallet with a Sign-In-With-X signature: no funds move. A store-wide cap of 200 free calls per day applies; after that, normal pricing applies.
- **Failed calls are not charged.** Invalid input (4xx) and server-side failures (5xx) cost nothing and don't use up a trial call.
- **The key stays local.** The MCP server uses the key only on the user's machine to sign payments and trial signatures. It is never sent to Softbot Studio.
- This skill contains no scripts and runs no code itself. It only explains how to use the MCP server.

## When to use which tool

| Need | Tool | Price (USDC) |
|---|---|---|
| Read or summarise a public web page as clean markdown (no browser needed) | `read_url` | 0.003 |
| Facts from a page: HTML tables as rows, JSON-LD, meta/OpenGraph, emails/phones/socials, links, headings, images, CSS-selector fields (Reader Pro) | `extract_structured` | 0.004 |
| See what a page actually looks like (JS-rendered layout, visual check, evidence, input for a vision model) | `screenshot_url` | 0.01 |
| A printable or archivable A4 PDF of a page | `page_to_pdf` | 0.01 |
| Before sending to, signing up with or accepting an email address | `check_email` | 0.002 |
| Vetting a company or sender domain (can it receive mail, SPF/DMARC/DKIM, age, disposable/typo) | `check_domain` | 0.002 |
| Before visiting, logging in to, paying on or recommending an unfamiliar site or link (phishing, lookalike, HTTPS, domain age) | `check_website` | 0.003 |
| Before buying, swapping, accepting or recommending an unfamiliar Solana token | `check_solana_token` | 0.01 |
| Before paying, airdropping to, trading with or trusting an unknown Solana wallet (includes OFAC sanctions match) | `check_wallet` | 0.005 |
| Check session spend, budget, paying wallet and prices | `softbot_status` | free |

Do **not** use these tools when a free option you already have does the job just as well (for example, a page you can already fetch and read, or a file that's already local). Token and wallet verdicts are risk signals, not financial advice. Say so when you report them.

Full inputs, outputs and endpoints are in [references/tools.md](references/tools.md).

## Setup

Check first whether the tools are already available (look for `softbot_status` in your tool list). If they are, skip to "Using the tools".

### 1. Wallet (the user does this)

The user needs a **dedicated, low-balance Solana wallet** for agent spending. Never use their main wallet.

- For the free trial only, the wallet needs no funds. It just has to sign.
- For paid calls it needs a little USDC on Solana mainnet (a dollar covers 100 or more calls). No SOL is needed, because the payment facilitator pays network fees.
- The key can be a base58 secret key or the JSON byte array that `solana-keygen` writes.

Rules for you, the agent:
- **Never ask the user to paste a private key into the chat**, and never print, log, echo, commit or copy the key anywhere. Ask the user to put it in the MCP config (or an environment variable) themselves.
- Don't create, fund or move money between wallets on the user's behalf unless they explicitly ask you to.

### 2. Install the MCP server

It runs locally over stdio with `npx -y softbot-mcp` and needs Node.js 20 or newer. Environment variables:

| Variable | Purpose |
|---|---|
| `SOLANA_PRIVATE_KEY` | Wallet key that signs trial signatures and payments. Without it, only `dry_run` works. |
| `MAX_SPEND_USDC` | Spending cap for each server session (default `0.25`). Calls that would go over it are refused. Recommend something small, e.g. `0.10`. |
| `SOFTBOT_DRY_RUN` | `1` = price-only mode: every tool returns its price and never pays. |
| `SOFTBOT_NO_TRIAL` | `1` = skip the free trial and always pay. |
| `SOLANA_RPC_URL` | Optional Solana RPC. Defaults to the public mainnet RPC. |

**Claude Code**: ask the user to run this, putting in their own key:
```
claude mcp add softbot -e SOLANA_PRIVATE_KEY=<key> -e MAX_SPEND_USDC=0.10 -- npx -y softbot-mcp
```

**Cursor**: in `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project). **Claude Desktop**: same shape in `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "softbot": {
      "command": "npx",
      "args": ["-y", "softbot-mcp"],
      "env": { "SOLANA_PRIVATE_KEY": "<key>", "MAX_SPEND_USDC": "0.10" }
    }
  }
}
```

**Codex CLI**: in `~/.codex/config.toml`:
```toml
[mcp_servers.softbot]
command = "npx"
args = ["-y", "softbot-mcp"]
env = { SOLANA_PRIVATE_KEY = "<key>", MAX_SPEND_USDC = "0.10" }
```

Other MCP clients: run `npx -y softbot-mcp` as a stdio server with the same env vars.

If a config file holding the key sits inside a project, make sure it's gitignored. Restart the client after editing, then call `softbot_status` to confirm the server is up and shows the expected wallet address.

## Using the tools

1. **Check status.** Call `softbot_status` (free) to see the wallet, the budget and what's been spent this session.
2. **Free trial first.** Just call the tool. During the trial, the result shows `"free_trial": true` and `"trial_remaining": N`. Tell the user the call was free, and how many free calls are left for that tool.
3. **Confirm before spending real USDC.** When a tool's trial is used up (`trial_remaining` reached 0, or a result shows `paid_usdc` above 0), ask the user before the next paid call. Say the tool, the price and why you need it. A user can give standing approval (for example, "up to $0.05 for this task"). Stay within it and report what you spent. If you're unsure of the price, call the tool with `"dry_run": true`. That returns the price and endpoint and pays nothing.
4. **Report the cost.** After paid calls, tell the user what you spent (`paid_usdc`, `session_spent_usdc`). Mention the Solana transaction (`tx`) if they want proof.
5. **Batch sensibly.** Don't loop over many URLs, emails or tokens with paid calls without the user approving the total first (count × price).

### Reading results

Each result is JSON with `status`, `free_trial`, `trial_remaining` (during the trial), `paid_usdc`, `tx`, `session_spent_usdc`, and then `result` (the API response). `screenshot_url` returns an MCP image plus metadata. `page_to_pdf` returns an embedded PDF resource.

## Errors and what to do

| Message or status | Meaning | Action |
|---|---|---|
| `SOLANA_PRIVATE_KEY is not set` | No wallet configured | Explain the setup steps above, or use `dry_run`. Don't ask for the key in chat. |
| `could not be parsed` / `must decode to 64 bytes` | Wrong key format | Ask the user to check that the key is base58 or the 64-number JSON array. |
| `Budget guard: ... Not paid.` | The call would go over `MAX_SPEND_USDC` | Tell the user. They can raise the cap and restart the server (spending resets on restart). Don't work around it. |
| `refusing to pay` | The server asked for more than the advertised price, or for a non-USDC asset | Stop and tell the user. Don't retry. |
| `status: 402` in an error result | Payment needed but not completed (usually no USDC left in the wallet, or the daily free-trial cap was reached) | Tell the user the wallet needs a little USDC on Solana, then ask before retrying. |
| `status: 400`/`422` (4xx) | Invalid input, e.g. a bad URL, private address, robots.txt block or malformed address | Not charged. Fix the input or tell the user. |
| `status: 503` (screenshot) | No browser free right now (see `Retry-After`) | Not charged. Wait and retry once. |
| `status: 5xx` | Upstream failure | Not charged. Retry once at most, then report. |
| `Call failed: ...` | Network or client error | Report it. Don't retry in a loop. |

## Without MCP (direct HTTP, Solana, Base, Polygon or Arbitrum)

Each tool is also a plain HTTPS endpoint that speaks x402 v2. The endpoints accept USDC on **Solana, Base, Polygon or Arbitrum**, so an agent with its own x402 client can call them directly: call it → HTTP 402 with a `PAYMENT-REQUIRED` header → retry with `PAYMENT-SIGNATURE`. The `softbot-mcp` server itself only pays with Solana. See [references/tools.md](references/tools.md) for endpoints, networks and pay-to addresses. The same rules apply: free trial first, and confirm with the user before spending.

## Links

- Source code, docs and issues: https://github.com/softbot-studio/softbot-agents (MCP server in `mcp/`)
- Store and agent docs: https://softbot-studio.pages.dev/ · https://softbot-studio.pages.dev/agents.md
- npm: https://www.npmjs.com/package/softbot-mcp
