# Softbot Reader

Turns any public web page URL into clean markdown (title, main text, links) for LLM context. Use when an agent needs to read a web page without running a browser.

Pay-per-call over [x402](https://x402.org) — no signup, no API key. Agents pay $0.003 USDC on Solana per successful call.

**Base URL:** https://softbot-reader-mainnet.softbot.workers.dev

| Endpoint | Price | Example body |
|---|---|---|
| `POST /v1/read` | $0.003 USDC | `{"url":"https://example.com"}` |
| `GET /health` | free | — |
| `GET /.well-known/x402` | free | discovery document |
| `GET /openapi.json` | free | OpenAPI 3 spec |

## Payment (x402 v2)
- Network: Solana mainnet (`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`)
- Asset: USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`), scheme `exact`
- Pay to: `9csHbkGGeQqNxvtZw8hPnC34NCcmZoZXVTEGC1MiDNRE`
- Facilitator: PayAI (https://facilitator.payai.network)
- Flow: call the endpoint without payment → HTTP 402 with a `PAYMENT-REQUIRED` header → retry with a `PAYMENT-SIGNATURE` header (any x402 v2 client does this automatically). Settlement details come back in `PAYMENT-RESPONSE`.
- Invalid input (4xx) and upstream failures (5xx) are **not charged**.

## Try it
```bash
curl -i -X POST https://softbot-reader-mainnet.softbot.workers.dev/v1/read -H 'content-type: application/json' -d '{"url":"https://example.com"}'   # → 402 + payment terms
```

## Paid call (Node, x402 v2 client)
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

Part of [Softbot Studio](https://softbot-studio.pages.dev/) — tools for AI agents. Contact: softbot@mail.grokbot.com
