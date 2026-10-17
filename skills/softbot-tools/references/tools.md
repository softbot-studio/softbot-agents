# Softbot tools reference

Source: softbot-mcp v0.2.0 and https://softbot-studio.pages.dev/agents.md. Every paid MCP tool also accepts `dry_run: true`, which returns the price and endpoint and pays nothing.

## MCP tools

### `read_url`: Softbot Reader ($0.003)
- Input: `url` (public http(s) URL)
- Returns clean markdown of the main text, plus title, metadata and links. Respects robots.txt.
- Endpoint: `POST https://softbot-reader-mainnet.softbot.workers.dev/v1/read`, body `{"url":"https://example.com"}`

### `extract_structured`: Softbot Reader Pro ($0.004)
- Input: `url`. Optional `include`: array of `meta`, `tables`, `links`, `contacts`, `jsonld`, `headings`, `images` (default: all). Optional `fields`: map of name → CSS selector (append ` @attr` for an attribute; up to 20).
- Returns machine-readable page data with no LLM: HTML tables as row objects, schema.org JSON-LD, OpenGraph/meta, emails, phones and social profiles, deduplicated links, heading outline, images with alt text, and selector fields.
- Endpoint: `POST https://softbot-reader-mainnet.softbot.workers.dev/v1/extract`, body `{"url":"https://en.wikipedia.org/wiki/List_of_tallest_buildings","include":["tables","meta"],"fields":{"title":"h1"}}`

### `screenshot_url`: Softbot Screenshot ($0.01)
- Input: `url`. Optional `width` (320–1920), `height` (240–1920), `full_page` (up to 8000px tall), `format` (`png` or `jpeg`), `wait_ms` (0–5000).
- Renders the page in headless Chrome and returns an MCP image. Private networks are blocked, including through redirects.
- Endpoint: `POST https://softbot-screenshot-mainnet.softbot.workers.dev/v1/screenshot`

### `page_to_pdf`: Softbot Screenshot ($0.01)
- Input: `url`. Optional `wait_ms` (0–5000).
- Returns an A4 PDF as an embedded resource (base64).
- Endpoint: `POST https://softbot-screenshot-mainnet.softbot.workers.dev/v1/pdf`

### `check_email`: Softbot Email Check ($0.002)
- Input: `email` (one address)
- Verdict `deliverable_likely`, `risky` or `invalid`, based on syntax, MX/A records, the disposable-provider list, role address, free provider, typo suggestion, SPF/DMARC/DKIM and domain age. It never contacts the mailbox (no SMTP probing).
- Endpoint: `POST https://softbot-emailcheck-mainnet.softbot.workers.dev/v1/email`

### `check_domain`: Softbot Email Check ($0.002)
- Input: `domain` (e.g. `example.com`)
- Whether the domain can receive mail (MX/A, null MX), whether it's disposable, free or a typo, plus its SPF/DMARC/DKIM setup and registration age.
- Endpoint: `POST https://softbot-emailcheck-mainnet.softbot.workers.dev/v1/domain`

### `check_website`: Softbot Website Check ($0.003)
- Input: `url` (URL or bare domain)
- Verdict `trustworthy_likely`, `caution` or `risky`, based on domain age, DNS (A/MX/NS), HTTPS and redirect chain, security headers, phishing/malware list snapshots, brand lookalike/typosquat detection, tech fingerprint and page title.
- Endpoint: `POST https://softbot-sitecheck-mainnet.softbot.workers.dev/v1/site`

### `check_solana_token`: Softbot Token Check ($0.01)
- Input: `mint` (Solana token mint address, base58)
- Verdict `safe`, `caution` or `avoid`, with a 0–100 risk score and reasons: mint and freeze authority, Token-2022 extensions, top-10 holder concentration (exchange/pool wallets excluded), token age, metadata and DEX liquidity. Not financial advice.
- Endpoint: `POST https://softbot-tokencheck-mainnet.softbot.workers.dev/v1/check`

### `check_wallet`: Softbot Wallet Check ($0.005)
- Input: `address` (Solana wallet address, base58)
- Verdict `established`, `new`, `suspicious` or `inactive`, based on SOL balance, token holdings, wallet age, 24h/7d activity, program-account detection, a bot-pattern heuristic and an OFAC sanctions match. Not financial advice.
- Endpoint: `POST https://softbot-walletcheck-mainnet.softbot.workers.dev/v1/wallet`

### `softbot_status` (free)
- No input. Returns the server version, paying wallet address, whether dry-run mode is on, session spend, session budget and the price of every tool.

## Free trial
- The first 3 successful calls per wallet are free for each of the 9 endpoints.
- The trial is proven with an x402 `sign-in-with-x` (CAIP-122) signature: SIWS (ed25519) for Solana or SIWE (EIP-191) for Base. No funds move. `softbot-mcp` signs it automatically with `SOLANA_PRIVATE_KEY`.
- Free responses carry the `x-trial: free` and `x-trial-remaining` headers, which the MCP server shows as `free_trial` and `trial_remaining`.
- Failed calls (4xx/5xx) don't use up a trial call. A store-wide cap of 200 free calls per day applies.

## Payment (x402 v2, scheme `exact`)
Each endpoint's 402 response offers both options at the same price.
- **Solana mainnet** (`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`): USDC mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, pay to `9csHbkGGeQqNxvtZw8hPnC34NCcmZoZXVTEGC1MiDNRE`, facilitator PayAI (https://facilitator.payai.network). This is the option `softbot-mcp` uses.
- **Base mainnet** (`eip155:8453`): USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, pay to `0xC68F3cCa31D50208ab4C933a38288938e0B21E63`, facilitator Coinbase CDP (https://api.cdp.coinbase.com/platform/v2/x402). Direct HTTP only.
- Flow: call with no payment → HTTP 402 with a `PAYMENT-REQUIRED` header → retry with a `PAYMENT-SIGNATURE` header (any x402 v2 client handles this). The settlement comes back in `PAYMENT-RESPONSE`.
- Invalid input (4xx) and upstream failures (5xx) are not charged.

## Machine-readable specs
Each service publishes `/openapi.json` and `/.well-known/x402` at its base URL, for example `https://softbot-reader-mainnet.softbot.workers.dev/openapi.json`. There is a combined list at https://softbot-studio.pages.dev/.well-known/x402.

## How softbot-mcp protects the wallet
- The key is used only locally, to sign. It is never logged or sent anywhere.
- It refuses to pay if a server asks for more than the advertised price, or for an asset other than USDC.
- `MAX_SPEND_USDC` caps spending for each server session (default 0.25). The counter resets when the server restarts.
