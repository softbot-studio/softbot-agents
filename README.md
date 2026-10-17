# Softbot Studio agent tools

x402 pay-per-call APIs for AI agents. Store: https://softbot-studio.pages.dev/


## Agent skill: softbot-tools
[`skills/softbot-tools/SKILL.md`](skills/softbot-tools/SKILL.md) is an open Agent Skills (SKILL.md) package for Claude Code, Cursor, Codex and similar agents. It tells them when to use these tools, how to set up the [`softbot-mcp`](mcp/) MCP server, and to use the free trial first and confirm with the user before spending USDC. Copy the `skills/softbot-tools/` folder into your agent's skills directory.


## Softbot Reader
Turns any public web page URL into clean markdown (title, main text, links) for LLM context. Use when an agent needs to read a web page without running a browser.

- Base URL: https://softbot-reader-mainnet.softbot.workers.dev
- `POST https://softbot-reader-mainnet.softbot.workers.dev/v1/read` — $0.003 — body `{"url":"https://example.com"}`
- Spec: https://softbot-reader-mainnet.softbot.workers.dev/openapi.json · Discovery: https://softbot-reader-mainnet.softbot.workers.dev/.well-known/x402

## Softbot Token Check
Safety verdict (safe / caution / avoid) for a Solana SPL token with reasons: mint & freeze authority, token age, top-10 holder concentration (exchange/pool wallets excluded), metadata and liquidity. Use before trading, accepting or recommending a Solana token.

- Base URL: https://softbot-tokencheck-mainnet.softbot.workers.dev
- `POST https://softbot-tokencheck-mainnet.softbot.workers.dev/v1/check` — $0.01 — body `{"mint":"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}`
- Spec: https://softbot-tokencheck-mainnet.softbot.workers.dev/openapi.json · Discovery: https://softbot-tokencheck-mainnet.softbot.workers.dev/.well-known/x402

## Softbot Email Check
Email address and domain check: verdict (deliverable_likely / risky / invalid) from syntax, MX/A records, disposable-provider list, role address, free provider, typo suggestion, SPF/DMARC/DKIM and domain age. No SMTP mailbox probing. Use before sending to, signing up, or accepting an email address.

- Base URL: https://softbot-emailcheck-mainnet.softbot.workers.dev
- `POST https://softbot-emailcheck-mainnet.softbot.workers.dev/v1/email` — $0.002 — body `{"email":"john@gmial.com"}`
- `POST https://softbot-emailcheck-mainnet.softbot.workers.dev/v1/domain` — $0.002 — body `{"domain":"example.com"}`
- Spec: https://softbot-emailcheck-mainnet.softbot.workers.dev/openapi.json · Discovery: https://softbot-emailcheck-mainnet.softbot.workers.dev/.well-known/x402

## Free trial
**First 3 calls free per wallet**, per tool (each of the 9 endpoints). No payment and no funds needed, just a free signature:
1. Call the endpoint normally. The HTTP 402 `PAYMENT-REQUIRED` header carries an x402 `sign-in-with-x` (SIWX, CAIP-122) challenge in `extensions["sign-in-with-x"]`.
2. Sign it with your Solana (SIWS, ed25519) or EVM/Base (SIWE, EIP-191) wallet and retry with the `SIGN-IN-WITH-X` header (`createSIWxPayload` + `encodeSIWxHeader` from `@x402/extensions/sign-in-with-x`).
3. A free call returns `x-trial: free` and `x-trial-remaining`. After 3 successful calls you get a normal 402: pay as usual.
- Failed calls (4xx/5xx) do not use up a trial. A store-wide cap of 200 free calls/day applies; after that, normal pricing.
- The `softbot-mcp` MCP server does this automatically.

## Payment (x402 v2)
- Network: Solana mainnet (`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`)
- Asset: USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`), scheme `exact`
- Pay to: `9csHbkGGeQqNxvtZw8hPnC34NCcmZoZXVTEGC1MiDNRE`
- Facilitator: PayAI (https://facilitator.payai.network)
- Flow: call the endpoint without payment → HTTP 402 with a `PAYMENT-REQUIRED` header → retry with a `PAYMENT-SIGNATURE` header (any x402 v2 client does this automatically). Settlement details come back in `PAYMENT-RESPONSE`.
- Invalid input (4xx) and upstream failures (5xx) are **not charged**.

## Client example
```js
// npm i @x402/fetch @x402/svm @solana/kit
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import fs from "fs";
// Your own funded Solana keypair (needs a little USDC). Never commit it.
const signer = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(fs.readFileSync(process.env.SOLANA_KEYPAIR))));
const pay = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", client: new ExactSvmScheme(signer) }],
});
const r = await pay("https://softbot-reader-mainnet.softbot.workers.dev/v1/read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({"url":"https://example.com"}) });
console.log(r.status, await r.json());
```

Contact: softbot@mail.grokbot.com

## Base USDC (Coinbase CDP)

All APIs also accept **USDC on Base** via the Coinbase CDP x402 facilitator, alongside Solana USDC (PayAI).
Base payTo: `0xC68F3cCa31D50208ab4C933a38288938e0B21E63`. The 402 response lists both payment options; pick either.
Listed in the Coinbase x402 Bazaar.
