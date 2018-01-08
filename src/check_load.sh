#!/usr/bin/env bash

# checks loading of blockchain from disk

trap "exit" INT TERM ERR
trap "kill 0" EXIT

./cleanslate.sh

# Start the node
NODE1="A"
NODE1_PORT=3000
NODE1_URL="http://localhost:${NODE1_PORT}"

node ../dist/final.js --port=${NODE1_PORT} --id=${NODE1} &
NODE1_PID=$!

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

BLOCK_COUNT=20
for (( i=1; i<=$BLOCK_COUNT; i++))
	do
		curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"
	done

echo -e && read -n 1 -s -r -p "Killing the blockchain node..." && echo -e

kill -15 $NODE1_PID

echo -e && read -n 1 -s -r -p "Reloading..." && echo -e

node ../dist/final.js --port=${NODE1_PORT} --id=${NODE1} &

sleep 2

echo -e && read -n 1 -s -r -p "Previous blocks should show up here. Press any key to continue..." && echo -e
curl "${NODE1_URL}/blocks" -w "\n"

wait
