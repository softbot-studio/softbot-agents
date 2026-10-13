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
