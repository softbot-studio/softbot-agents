#!/bin/sh
# Unpaid call: shows the 402 payment terms
curl -i -X POST https://softbot-emailcheck-mainnet.softbot.workers.dev/v1/email -H 'content-type: application/json' -d '{"email":"john@gmial.com"}'
