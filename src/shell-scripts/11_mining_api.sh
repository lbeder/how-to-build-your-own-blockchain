#!/usr/bin/env bash

trap "exit" INT TERM ERR
trap "kill 0" EXIT

./cleanslate.sh

# Start the nodes.
NODE_PORT=3000
NODE_URL="http://localhost:${NODE_PORT}"

node ../../dist/11_mining_api.js &

sleep 2

# Submit 2 transactions to the node.
echo -e && read -n 1 -s -r -p "Submitting transactions. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" -d '{
 "senderAddress": "Alice",
 "recipientAddress": "Bob",
 "value": "1000"
}' "${NODE_URL}/transactions" -w "\n"

curl -X POST -H "Content-Type: application/json" -d '{
 "senderAddress": "Alice",
 "recipientAddress": "Eve",
 "value": "12345"
}' "${NODE_URL}/transactions" -w "\n"

# Mine one block.
echo -e && read -n 1 -s -r -p "Mining first block. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" "${NODE_URL}/blocks/mine" -w "\n"

# Mine another block.
echo -e && read -n 1 -s -r -p "Mining second block. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" "${NODE_URL}/blocks/mine" -w "\n"

wait
