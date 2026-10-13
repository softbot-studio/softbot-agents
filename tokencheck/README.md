# Softbot Token Check

Safety verdict (safe / caution / avoid) for a Solana SPL token with reasons: mint & freeze authority, token age, top-10 holder concentration (exchange/pool wallets excluded), metadata and liquidity. Use before trading, accepting or recommending a Solana token.

Pay-per-call over [x402](https://x402.org) — no signup, no API key. Agents pay $0.01 USDC on Solana per successful call.

**Base URL:** https://softbot-tokencheck-mainnet.softbot.workers.dev

| Endpoint | Price | Example body |
|---|---|---|
| `POST /v1/check` | $0.01 USDC | `{"mint":"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}` |
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
curl -i -X POST https://softbot-tokencheck-mainnet.softbot.workers.dev/v1/check -H 'content-type: application/json' -d '{"mint":"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}'   # → 402 + payment terms
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
const r = await pay("https://softbot-tokencheck-mainnet.softbot.workers.dev/v1/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({"mint":"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}) });
console.log(r.status, await r.json());
```

Part of [Softbot Studio](https://softbot-studio.pages.dev/) — tools for AI agents. Contact: softbot@mail.grokbot.com
