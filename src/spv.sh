#!/usr/bin/env bash

trap "exit" INT TERM ERR
trap "kill 0" EXIT

./cleanslate.sh

# Start the node
NODE1="A"
NODE1_PORT=3000
NODE1_URL="http://localhost:${NODE1_PORT}"

node ../dist/final.js --port=${NODE1_PORT} --id=${NODE1} &

sleep 2

# Do some transactions
echo -e && read -n 1 -s -r -p "Going to do some transactions. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" -d '{
 "senderAddress": "Alice",
 "recipientAddress": "Bob",
 "value": "1000"
}' "${NODE1_URL}/transactions" -w "\n"

curl -X POST -H "Content-Type: application/json" -d '{
 "senderAddress": "Alice",
 "recipientAddress": "Eve",
 "value": "12345"
}' "${NODE1_URL}/transactions" -w "\n"

curl -X POST -H "Content-Type: application/json" -d '{
 "senderAddress": "Bob",
 "recipientAddress": "Alice",
 "value": "500"
}' "${NODE1_URL}/transactions" -w "\n"

curl -X POST -H "Content-Type: application/json" -d '{
 "senderAddress": "Bob",
 "recipientAddress": "Alice",
 "value": "5"
}' "${NODE1_URL}/transactions" -w "\n"

curl -X POST -H "Content-Type: application/json" -d '{
 "senderAddress": "Bob",
 "recipientAddress": "Eve",
 "value": "50"
}' "${NODE1_URL}/transactions" -w "\n"

# Mine some blocks to commit our transactions
echo -e && read -n 1 -s -r -p "Mining some blocks. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"
curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"

echo -e && read -n 1 -s -r -p "Doing filter query on the node" && echo -e

DEPTH=10
START=0

# do request with simple bloom filter containing "Alice"

echo "Should show block #1"
curl -X POST -H "Content-Type: application/json" -d '{
	"filter": [67108864,256,4194304,16,262144,1,268451840,0,1024,16777216,64,1048576,4,1073807360,0,4096]
}' "${NODE1_URL}/blocks/filter/${DEPTH}" -w "\n"

echo "Should show no blocks"
curl -X POST -H "Content-Type: application/json" -d '{
	"filter": [67108864,256,4194304,16,262144,1,268451840,0,1024,16777216,64,1048576,4,1073807360,0,4096]
}' "${NODE1_URL}/blocks/filter/${DEPTH}/2" -w "\n"

wait
