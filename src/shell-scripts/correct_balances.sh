#!/usr/bin/env bash

# Create accounts with balance of 100
# We'll do a series of transactions, followed by mining and consensus
# We'll create a scenario where an account requests an illegal transfer of funds. 
# We will verify that the transaction will not go through and the appropiate error msg will log
# We will verify that the blockchain correctly reflects the transaction history.
# The correct balance in the end should be Bob - 80, Eve - 125, Alice - 95, everyone else 100.

trap "exit" INT TERM ERR
trap "kill 0" EXIT

./cleanslate.sh

# Define actions for State machine
CREATE_EXTERNAL_ACCOUNT="CREATE_EXTERNAL_ACCOUNT"
CREATE_CONTRACT_ACCOUNT="CREATE_CONTRACT_ACCOUNT"
CONTRACT_ACCOUNT="CONTRACT_ACCOUNT"
EXTERNAL_ACCOUNT="EXTERNAL_ACCOUNT"
NODE_REGISTERED="NODE_REGISTERED"
TRANSACTION_EXTERNAL_ACCOUNT="TRANSACTION_EXTERNAL_ACCOUNT"
TRANSACTION_CONTRACT_ACCOUNT="TRANSACTION_CONTRACT_ACCOUNT"

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
 \"url\": \"${NODE2_URL}\",
 \"action\": \"${NODE_REGISTERED}\"
}" "${NODE1_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE2}\",
 \"url\": \"${NODE2_URL}\",
 \"action\": \"${NODE_REGISTERED}\"
}" "${NODE2_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE2}\",
 \"url\": \"${NODE2_URL}\",
 \"action\": \"${NODE_REGISTERED}\"
}" "${NODE3_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE1}\",
 \"url\": \"${NODE1_URL}\",
 \"action\": \"${NODE_REGISTERED}\"
}" "${NODE2_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE1}\",
 \"url\": \"${NODE1_URL}\",
 \"action\": \"${NODE_REGISTERED}\"
}" "${NODE1_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE1}\",
 \"url\": \"${NODE1_URL}\",
 \"action\": \"${NODE_REGISTERED}\"
}" "${NODE3_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE3}\",
 \"url\": \"${NODE3_URL}\",
 \"action\": \"${NODE_REGISTERED}\"
}" "${NODE2_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE3}\",
 \"url\": \"${NODE3_URL}\",
 \"action\": \"${NODE_REGISTERED}\"
}" "${NODE3_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE3}\",
 \"url\": \"${NODE3_URL}\",
 \"action\": \"${NODE_REGISTERED}\"
}" "${NODE1_URL}/nodes" -w "\n"

sleep 2

# Register Accounts on Nodes
echo -e && read -n 1 -s -r -p "Registering accounts on nodes. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Alice\",
 \"balance\": 100,
 \"action\": \"${CREATE_EXTERNAL_ACCOUNT}\",
 \"account_type\": \"${EXTERNAL_ACCOUNT}\",
 \"nodeId\": \"A\"
}" "${NODE1_URL}/propogateAccountCreation" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Bob\",
 \"balance\": 100,
 \"action\": \"${CREATE_EXTERNAL_ACCOUNT}\",
 \"account_type\": \"${EXTERNAL_ACCOUNT}\",
 \"nodeId\": \"B\"
}" "${NODE2_URL}/propogateAccountCreation" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Ben Affleck\",
 \"balance\": 100,
 \"action\": \"${CREATE_EXTERNAL_ACCOUNT}\",
 \"account_type\": \"${EXTERNAL_ACCOUNT}\",
 \"nodeId\": \"C\"
}" "${NODE3_URL}/propogateAccountCreation" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Selena Gomez\",
 \"balance\": 100,
 \"action\": \"${CREATE_EXTERNAL_ACCOUNT}\",
 \"account_type\": \"${EXTERNAL_ACCOUNT}\",
 \"nodeId\": \"A\"
}" "${NODE1_URL}/propogateAccountCreation" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Gal Gadot\",
 \"balance\": 100,
 \"action\": \"${CREATE_EXTERNAL_ACCOUNT}\",
 \"account_type\": \"${EXTERNAL_ACCOUNT}\",
 \"nodeId\": \"C\"
}" "${NODE3_URL}/propogateAccountCreation" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"address\": \"Eve\",
 \"balance\": 100,
 \"action\": \"${CREATE_EXTERNAL_ACCOUNT}\",
 \"account_type\": \"${EXTERNAL_ACCOUNT}\",
 \"nodeId\": \"B\"
}" "${NODE2_URL}/propogateAccountCreation" -w "\n"

sleep 2

# Submit 4 transactions
echo -e && read -n 1 -s -r -p "Submitting transactions. Press any key to continue..." && echo -e

printf "Message\n SenderNode: Node B\n SenderAddress: Bob\n RecipientNode: B\n RecipientAddress: Eve \n Value: 20\n Signing request..."
curl -X POST -H "Content-Type: application/json" -d '{
"senderNodeId": "B",
"senderAddress": "Bob",
"recipientNodeId": "B",
"recipientAddress": "Eve",
"value": 20,
"action": "TRANSACTION_EXTERNAL_ACCOUNT",
"data": "({ balance: 1000, incrementValue: function() { this.balance++; }, id: 1, fromAddress: \"Alice\", call: function() { return {getBalance: this.balance, getFromAddress: this.fromAddress}}, send: function() { return { incrementValue: this.incrementValue} }, abi: function() { return {sendables: this.incrementValue.toString()} } })"
}' "${NODE1_URL}/transactions" -w "\n"

printf "Message\n SenderNode: Node A\n SenderAddress: Alice\n RecipientNode: B\n RecipientAddress: Eve \n Value: 40\n Signing request..."
curl -X POST -H "Content-Type: application/json" -d '{
"senderNodeId": "A",
"senderAddress": "Alice",
"recipientNodeId": "B",
"recipientAddress": "Eve",
"value": 40,
"action": "TRANSACTION_EXTERNAL_ACCOUNT"
}' "${NODE1_URL}/transactions" -w "\n"


printf "Message\n SenderNode: Node B\n SenderAddress: Eve\n RecipientNode: B\n RecipientAddress: Alice \n Value: 30\n Signing request..."
curl -X POST -H "Content-Type: application/json" -d '{
"senderNodeId": "B",
"senderAddress": "Eve",
"recipientNodeId": "A",
"recipientAddress": "Alice",
"value": 30,
"action": "TRANSACTION_EXTERNAL_ACCOUNT"
}' "${NODE1_URL}/transactions" -w "\n"

printf "Message\n SenderNode: Node B\n SenderAddress: Eve\n RecipientNode: B\n RecipientAddress: Alice \n Value: 5\n Signing request..."
curl -X POST -H "Content-Type: application/json" -d '{
"senderNodeId": "B",
"senderAddress": "Eve",
"recipientNodeId": "A",
"recipientAddress": "Alice",
"value": 5,
"action": "TRANSACTION_EXTERNAL_ACCOUNT"
}' "${NODE1_URL}/transactions" -w "\n"

# Mine 3 blocks on the first node.
echo -e && read -n 1 -s -r -p "Mining blocks. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"
curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"
curl -X POST -H "Content-Type: application/json" "${NODE2_URL}/blocks/mine" -w "\n"

# Reach a consensus on nodes:
echo -e && read -n 1 -s -r -p "Reaching a consensus. Press any key to continue..." && echo -e

curl -X PUT "${NODE1_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/consensus" -w "\n"

printf "Check correct balances via /nodes GET request in Postman client"

wait
