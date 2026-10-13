#!/bin/sh
# Unpaid call: shows the 402 payment terms
curl -i -X POST https://softbot-tokencheck-mainnet.softbot.workers.dev/v1/check -H 'content-type: application/json' -d '{"mint":"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}'
