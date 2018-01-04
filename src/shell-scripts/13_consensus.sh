#!/usr/bin/env bash

trap "exit" INT TERM ERR
trap "kill 0" EXIT

./cleanslate.sh

# Start the nodes.
NODE1="A"
NODE1_PORT=3000
NODE1_URL="http://localhost:${NODE1_PORT}"
NODE2="B"
NODE2_PORT=3001
NODE2_URL="http://localhost:${NODE2_PORT}"
NODE3="C"
NODE3_PORT=3002
NODE3_URL="http://localhost:${NODE3_PORT}"

# Start two servers on respective ports
node ../../dist/server.js --port=${NODE1_PORT} --id=${NODE1} &
node ../../dist/server.js --port=${NODE2_PORT} --id=${NODE2} &
node ../../dist/server.js --port=${NODE3_PORT} --id=${NODE3} &

sleep 2

# Register the nodes.
echo -e && read -n 1 -s -r -p "Registering the node. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE2}\",
 \"url\": \"${NODE2_URL}\"
}" "${NODE1_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE2}\",
 \"url\": \"${NODE2_URL}\"
}" "${NODE2_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE2}\",
 \"url\": \"${NODE2_URL}\"
}" "${NODE3_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE1}\",
 \"url\": \"${NODE1_URL}\"
}" "${NODE2_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE1}\",
 \"url\": \"${NODE1_URL}\"
}" "${NODE1_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE1}\",
 \"url\": \"${NODE1_URL}\"
}" "${NODE3_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE3}\",
 \"url\": \"${NODE3_URL}\"
}" "${NODE2_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE3}\",
 \"url\": \"${NODE3_URL}\"
}" "${NODE3_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE3}\",
 \"url\": \"${NODE3_URL}\"
}" "${NODE1_URL}/nodes" -w "\n"

# Register Accounts on Nodes
echo -e && read -n 1 -s -r -p "Registering accounts on nodes. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Alice\",
 \"balance\": \"43\",
 \"type\": \"external_account\",
 \"nodeId\": \"A\"
}" "${NODE1_URL}/propogateAccountCreation" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Bob\",
 \"balance\": \"100\",
 \"type\": \"external_account\",
 \"nodeId\": \"B\"
}" "${NODE2_URL}/propogateAccountCreation" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Ben Affleck\",
 \"balance\": \"4000\",
 \"type\": \"external_account\",
 \"nodeId\": \"C\"
}" "${NODE3_URL}/propogateAccountCreation" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Selena Gomez\",
 \"balance\": \"232\",
 \"type\": \"external_account\",
 \"nodeId\": \"A\"
}" "${NODE1_URL}/propogateAccountCreation" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Gal Gadot\",
 \"balance\": \"987\",
 \"type\": \"external_account\",
 \"nodeId\": \"C\"
}" "${NODE3_URL}/propogateAccountCreation" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Eve\",
 \"balance\": \"337\",
 \"type\": \"external_account\",
 \"nodeId\": \"B\"
}" "${NODE2_URL}/propogateAccountCreation" -w "\n"

# Submit 2 transactions to the first node.
echo -e && read -n 1 -s -r -p "Submitting transactions. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" -d '{
 "senderAddress": "DavinciPaintingContract",
 "recipientAddress": "Eve",
 "value": "12345",
 "type": "contract_account",
 "data": "({ balance: 1000, incrementValue: function() { this.balance++; }, id: 1, fromAddress: \"Alice\", call: function() { return {getBalance: this.balance, getFromAddress: this.fromAddress}}, send: function() { return { incrementValue: this.incrementValue} }, abi: function() { return {sendables: this.incrementValue.toString()} } })"
}' "${NODE1_URL}/transactions" -w "\n"

curl -X POST -H "Content-Type: application/json" -d '{
 "senderAddress": "Alice",
 "recipientAddress": "Eve",
 "value": "12345",
 "type": "external_account"
}' "${NODE1_URL}/transactions" -w "\n"

curl -X POST -H "Content-Type: application/json" -d '{
 "senderAddress": "Alice",
 "recipientAddress": "Eve",
 "value": "12345",
 "type": "external_account"
}' "${NODE3_URL}/transactions" -w "\n"

# Mine 3 blocks on the first node.
echo -e && read -n 1 -s -r -p "Mining blocks. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"
curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"
curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"

# Reach a consensus on nodes:
echo -e && read -n 1 -s -r -p "Reaching a consensus. Press any key to continue..." && echo -e

curl -X PUT "${NODE1_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/consensus" -w "\n"

wait
