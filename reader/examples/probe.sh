#!/bin/sh
# Unpaid call: shows the 402 payment terms
curl -i -X POST https://softbot-reader-mainnet.softbot.workers.dev/v1/read -H 'content-type: application/json' -d '{"url":"https://example.com"}'
