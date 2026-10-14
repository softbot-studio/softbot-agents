#!/usr/bin/env node
/**
 * softbot-mcp: MCP stdio server exposing Softbot Studio's pay-per-call x402 APIs.
 * Pays each call in USDC on Solana mainnet from SOLANA_PRIVATE_KEY.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import bs58 from "bs58";
const VERSION = "0.1.0";
const NETWORK = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PAY_TO = "9csHbkGGeQqNxvtZw8hPnC34NCcmZoZXVTEGC1MiDNRE";
const RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const MAX_SPEND = Number(process.env.MAX_SPEND_USDC ?? "0.25");
const DRY_ENV = /^(1|true|yes)$/i.test(process.env.SOFTBOT_DRY_RUN || "");
const HOSTS = {
    reader: process.env.SOFTBOT_READER_URL || "https://softbot-reader-mainnet.softbot.workers.dev",
    token: process.env.SOFTBOT_TOKENCHECK_URL || "https://softbot-tokencheck-mainnet.softbot.workers.dev",
    email: process.env.SOFTBOT_EMAILCHECK_URL || "https://softbot-emailcheck-mainnet.softbot.workers.dev",
    wallet: process.env.SOFTBOT_WALLETCHECK_URL || "https://softbot-walletcheck-mainnet.softbot.workers.dev",
    site: process.env.SOFTBOT_SITECHECK_URL || "https://softbot-sitecheck-mainnet.softbot.workers.dev",
    shot: process.env.SOFTBOT_SCREENSHOT_URL || "https://softbot-screenshot-mainnet.softbot.workers.dev",
};
let spentAtomic = 0; // USDC 6 decimals
const fmt = (a) => (a / 1e6).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
const budgetAtomic = Math.round(MAX_SPEND * 1e6);
function parseKey(raw) {
    const s = raw.trim();
    if (s.startsWith("["))
        return new Uint8Array(JSON.parse(s));
    return bs58.decode(s);
}
let payFetchPromise = null;
function getPayer(maxAtomic) {
    if (!payFetchPromise) {
        payFetchPromise = (async () => {
            const raw = process.env.SOLANA_PRIVATE_KEY;
            if (!raw)
                throw new Error("SOLANA_PRIVATE_KEY is not set. Provide a Solana keypair (base58 or JSON byte array) for a wallet holding a little USDC on mainnet, or use dry_run.");
            let bytes;
            try {
                bytes = parseKey(raw);
            }
            catch {
                throw new Error("SOLANA_PRIVATE_KEY could not be parsed (expected base58 string or JSON array of 64 bytes).");
            }
            if (bytes.length !== 64)
                throw new Error(`SOLANA_PRIVATE_KEY must decode to 64 bytes (got ${bytes.length}).`);
            const signer = await createKeyPairSignerFromBytes(bytes);
            bytes.fill(0);
            // Guard fetch: refuses to let the x402 client pay if the server asks more than the advertised price.
            const guarded = async (input, init) => {
                const r = await fetch(input, init);
                if (r.status === 402) {
                    const h = r.headers.get("payment-required");
                    if (h) {
                        try {
                            const req = JSON.parse(Buffer.from(h, "base64").toString("utf8"));
                            const acc = (req.accepts || []).find((a) => a.network === NETWORK);
                            if (acc && (Number(acc.amount) > maxAtomic() || acc.asset !== USDC_MINT))
                                throw new Error(`Server asked ${fmt(Number(acc.amount))} (${acc.asset}), more than the allowed ${fmt(maxAtomic())} USDC; refusing to pay.`);
                        }
                        catch (e) {
                            if (String(e.message).includes("refusing"))
                                throw e;
                        }
                    }
                }
                return r;
            };
            const pay = wrapFetchWithPaymentFromConfig(guarded, {
                schemes: [{ network: NETWORK, client: new ExactSvmScheme(signer, { rpcUrl: RPC }) }],
            });
            return { pay, address: signer.address };
        })();
    }
    return payFetchPromise;
}
const url = z.string().url().describe("Public http(s) URL");
const DEFS = [
    { name: "read_url", title: "Read web page", host: HOSTS.reader, path: "/v1/read", price: 3000,
        description: "Fetch a public web page and return clean markdown plus title and metadata (respects robots.txt). Use when you need to read or summarize the text of an article, docs page or any URL. Price: $0.003 USDC per call (Solana).",
        shape: { url } },
    { name: "extract_structured", title: "Extract structured page data", host: HOSTS.reader, path: "/v1/extract", price: 4000,
        description: "Reader Pro: return machine-readable data from a page without an LLM: meta/OpenGraph, JSON-LD, HTML tables as row objects, links, emails/phones/socials, headings, images, plus optional CSS-selector fields. Use when you need facts, tables or contact details from a page rather than prose. Price: $0.004 USDC per call.",
        shape: { url,
            include: z.array(z.enum(["meta", "tables", "links", "contacts", "jsonld", "headings", "images"])).optional().describe("Sections to return (default: all)"),
            fields: z.record(z.string(), z.string()).optional().describe("Map name -> CSS selector (append ' @attr' for an attribute). Max 20.") } },
    { name: "check_solana_token", title: "Solana token safety check", host: HOSTS.token, path: "/v1/check", price: 10000,
        description: "Solana token safety verdict (safe/caution/avoid) with a 0-100 risk score and reasons: mint/freeze authority, Token-2022 extensions, holder concentration, age, DEX liquidity. Use when about to buy, swap, accept or recommend an unfamiliar Solana token. Not financial advice. Price: $0.01 USDC per call.",
        shape: { mint: z.string().describe("Solana token mint address (base58)") } },
    { name: "check_email", title: "Email address check", host: HOSTS.email, path: "/v1/email", price: 2000,
        description: "Email address verdict (deliverable_likely/risky/invalid) from syntax, MX, disposable list, role address, typo suggestion, SPF/DMARC/DKIM and domain age. Does not contact the mailbox. Use when about to send to, sign up with, or accept an email address. Price: $0.002 USDC per call.",
        shape: { email: z.string().describe("Single email address") } },
    { name: "check_domain", title: "Email domain check", host: HOSTS.email, path: "/v1/domain", price: 2000,
        description: "Whether a domain can receive mail (MX/A, null MX), is disposable/free/typo, its SPF/DMARC/DKIM posture and registration age. Use when vetting a company or sender domain rather than a specific mailbox. Price: $0.002 USDC per call.",
        shape: { domain: z.string().describe("Single domain, e.g. example.com") } },
    { name: "check_wallet", title: "Solana wallet profile", host: HOSTS.wallet, path: "/v1/wallet", price: 5000,
        description: "Solana wallet verdict (established/new/suspicious/inactive) from SOL balance, holdings, age, recent activity, program-account detection, bot-pattern heuristic and OFAC sanctions match. Use when about to pay, airdrop to, trade with or trust an unknown wallet. Price: $0.005 USDC per call.",
        shape: { address: z.string().describe("Solana wallet address (base58)") } },
    { name: "check_website", title: "Website trust check", host: HOSTS.site, path: "/v1/site", price: 3000,
        description: "Website trust verdict (trustworthy_likely/caution/risky) from domain age, DNS, HTTPS and redirects, security headers, phishing/malware lists, brand lookalike detection and tech fingerprint. Use when about to visit, log in to, pay on, or recommend an unfamiliar site or link. Price: $0.003 USDC per call.",
        shape: { url: z.string().describe("URL or bare domain, e.g. https://example.com/login") } },
    { name: "screenshot_url", title: "Screenshot web page", host: HOSTS.shot, path: "/v1/screenshot", price: 10000, kind: "image",
        description: "Render a public page in headless Chrome and return a PNG/JPEG screenshot as an image. Use when you need to see what a page actually looks like (layout, visual check, proof, charts). Price: $0.01 USDC per call.",
        shape: { url,
            width: z.number().int().min(320).max(1920).optional(), height: z.number().int().min(240).max(1920).optional(),
            full_page: z.boolean().optional().describe("Capture full scroll height (max 8000px)"),
            format: z.enum(["png", "jpeg"]).optional(), wait_ms: z.number().int().min(0).max(5000).optional() } },
    { name: "page_to_pdf", title: "Save page as PDF", host: HOSTS.shot, path: "/v1/pdf", price: 10000, kind: "pdf",
        description: "Render a public page in headless Chrome and return it as an A4 PDF (embedded resource, base64). Use when you need a printable or archivable copy of a page, receipt or article. Price: $0.01 USDC per call.",
        shape: { url, wait_ms: z.number().int().min(0).max(5000).optional() } },
];
const server = new McpServer({ name: "softbot-mcp", version: VERSION });
const dryShape = { dry_run: z.boolean().optional().describe("If true, only report the price; nothing is paid.") };
for (const d of DEFS) {
    server.registerTool(d.name, { title: d.title, description: d.description, inputSchema: { ...d.shape, ...dryShape } }, async (args) => {
        const { dry_run, ...body } = args;
        const endpoint = d.host + d.path;
        if (dry_run || DRY_ENV) {
            return { content: [{ type: "text", text: JSON.stringify({ dry_run: true, tool: d.name, endpoint, price_usdc: fmt(d.price),
                            network: "solana-mainnet", asset: "USDC", pay_to: PAY_TO, session_spent_usdc: fmt(spentAtomic),
                            session_budget_usdc: fmt(budgetAtomic), would_fit_budget: spentAtomic + d.price <= budgetAtomic, request_body: body }, null, 2) }] };
        }
        if (spentAtomic + d.price > budgetAtomic)
            return { isError: true, content: [{ type: "text", text: `Budget guard: this call costs ${fmt(d.price)} USDC, session already spent ${fmt(spentAtomic)} of MAX_SPEND_USDC=${fmt(budgetAtomic)}. Not paid.` }] };
        try {
            const { pay } = await getPayer(() => Math.min(d.price, budgetAtomic - spentAtomic));
            const r = await pay(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
            const prh = r.headers.get("payment-response");
            let settlement = null;
            if (prh) {
                try {
                    settlement = decodePaymentResponseHeader(prh);
                }
                catch { }
            }
            if (settlement?.success)
                spentAtomic += d.price;
            const text = await r.text();
            let j = null;
            try {
                j = JSON.parse(text);
            }
            catch { }
            const meta = { status: r.status, paid_usdc: settlement?.success ? fmt(d.price) : "0", tx: settlement?.transaction ?? null, session_spent_usdc: fmt(spentAtomic) };
            if (!r.ok)
                return { isError: true, content: [{ type: "text", text: JSON.stringify({ ...meta, error: j ?? text.slice(0, 2000) }, null, 2) }] };
            if (d.kind === "image" && j?.data_base64) {
                const b64 = j.data_base64;
                delete j.data_base64;
                return { content: [{ type: "image", data: b64, mimeType: j.content_type || (body.format === "jpeg" ? "image/jpeg" : "image/png") },
                        { type: "text", text: JSON.stringify({ ...meta, ...j }, null, 2) }] };
            }
            if (d.kind === "pdf" && j?.data_base64) {
                const b64 = j.data_base64;
                delete j.data_base64;
                return { content: [{ type: "resource", resource: { uri: `softbot://pdf/${encodeURIComponent(body.url)}`, mimeType: "application/pdf", blob: b64 } },
                        { type: "text", text: JSON.stringify({ ...meta, ...j }, null, 2) }] };
            }
            return { content: [{ type: "text", text: JSON.stringify({ ...meta, result: j ?? text }, null, 2) }] };
        }
        catch (e) {
            return { isError: true, content: [{ type: "text", text: `Call failed: ${String(e?.message || e).slice(0, 500)}` }] };
        }
    });
}
server.registerTool("softbot_status", { title: "Softbot session status",
    description: "Show this session's USDC spend, budget, paying wallet address and tool prices. Free; use before paid calls to check remaining budget.", inputSchema: {} }, async () => {
    let address = null;
    if (process.env.SOLANA_PRIVATE_KEY) {
        try {
            address = (await getPayer(() => 0)).address;
        }
        catch { }
    }
    return { content: [{ type: "text", text: JSON.stringify({ version: VERSION, wallet: address, dry_run_env: DRY_ENV,
                    session_spent_usdc: fmt(spentAtomic), session_budget_usdc: fmt(budgetAtomic),
                    prices_usdc: Object.fromEntries(DEFS.map(d => [d.name, fmt(d.price)])) }, null, 2) }] };
});
await server.connect(new StdioServerTransport());
