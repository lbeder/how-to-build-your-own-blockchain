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

node ../dist/final.js --port=${NODE1_PORT} --id=${NODE1} &
node ../dist/final.js --port=${NODE2_PORT} --id=${NODE2} &
node ../dist/final.js --port=${NODE3_PORT} --id=${NODE3} &

sleep 2

# Register the nodes.
echo -e && read -n 1 -s -r -p "Node2 knows both Node1 and Node3. However, Node1 doesn't know Node3" && echo -e

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE2}\",
 \"url\": \"${NODE2_URL}\"
}" "${NODE1_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE1}\",
 \"url\": \"${NODE1_URL}\"
}" "${NODE2_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE3}\",
 \"url\": \"${NODE3_URL}\"
}" "${NODE2_URL}/nodes" -w "\n"

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${NODE2}\",
 \"url\": \"${NODE2_URL}\"
}" "${NODE3_URL}/nodes" -w "\n"


function submit_new_transaction_by_client {
	transaction_id=$(cat /proc/sys/kernel/random/uuid)
	#TODO: Sign for real
	signature=$(cat /proc/sys/kernel/random/uuid)
	curl -X POST -H "Content-Type: application/json" -d @<(cat <<EOF
	{
	 "senderAddress": "${1}",
	 "recipientAddress": "${2}",
	 "value": "${3}",
	 "commision": "${4}",
	 "transaction_id": "${transaction_id}",
	 "signature": "${signature}"
	}
EOF
) "${5}/transactions" -w "\n"
t=("${1}" "${2}" "${3}" "${4}" "${transaction_id}" "${signature}")
}

function submit_exiting_transaction_by_client {
	curl -X POST -H "Content-Type: application/json" -d @<(cat <<EOF
	{
	 "senderAddress": "${1}",
	 "recipientAddress": "${2}",
	 "value": "${3}",
	 "commision": "${4}",
	 "transaction_id": "${5}",
	 "signature": "${6}"
	}
EOF
) "${7}/transactions" -w "\n"
}

# Submitting transactions
echo -e && read -n 1 -s -r -p "Submit 5 transactions to the first node, 4 to the second node and 3 for the third. Press any key to continue..." && echo -e

# First 3 transactions submitted to all nodes
submit_new_transaction_by_client "Daredevil" "Wolverine" "1000" "10" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"


submit_new_transaction_by_client "Daredevil" "Thor" "12345" "15" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"

submit_new_transaction_by_client "Luke_Cage" "Thor" "15000" "9" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"

# The following transaction is submitted to Node1 and Node2 only.
submit_new_transaction_by_client "Black_Widow" "Captain_America" "12345" "19" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"

# Last transaction submitted only to Node1
submit_new_transaction_by_client "Iron_Man" "Ultron" "50000" "23" "${NODE1_URL}"

# Reach a transactions load consensus on all the nodes:
echo -e && read -n 1 -s -r -p "Reaching a trasactions load consensus. Press any key to continue..." && echo -e

curl -X PUT "${NODE1_URL}/nodes/transactions_consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/transactions_consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/transactions_consensus" -w "\n"

# Mine 1 blocks on the first node.
echo -e && read -n 1 -s -r -p "Mining 1 block on the first node. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"


# Reach a blockchain consensus on both of the nodes:
echo -e && read -n 1 -s -r -p "Reaching a blockchain consensus. Press any key to continue..." && echo -e

curl -X PUT "${NODE1_URL}/nodes/blockchain_consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/blockchain_consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/blockchain_consensus" -w "\n"

# Reach a transactions load consensus on all the nodes:
echo -e && read -n 1 -s -r -p "Reaching a trasactions load consensus. Press any key to continue..." && echo -e

curl -X PUT "${NODE1_URL}/nodes/transactions_consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/transactions_consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/transactions_consensus" -w "\n"

wait

