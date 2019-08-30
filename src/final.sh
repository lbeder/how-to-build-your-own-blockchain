#!/usr/bin/env bash

trap "exit" INT TERM ERR
trap "kill 0" EXIT

./cleanslate.sh
. ./final_funcs.sh

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

register_node "${NODE1_URL}" "${NODE2}" "${NODE2_URL}"

register_node "${NODE2_URL}" "${NODE1}" "${NODE1_URL}"

register_node "${NODE2_URL}" "${NODE3}" "${NODE3_URL}"

register_node "${NODE3_URL}" "${NODE2}" "${NODE2_URL}"

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

curl -s -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n" >> /dev/null


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

# Submitting more transactions
echo -e && read -n 1 -s -r -p "Submit 10 transactions to every node, And 10 more to the 3rd node. Press any key to continue..." && echo -e

# 10 Transactions to all nodes
# 1
submit_new_transaction_by_client "Daredevil" "Wolverine" "1000" "10" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"
# 2
submit_new_transaction_by_client "Daredevil" "Wolverine" "1000" "11" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"
# 3
submit_new_transaction_by_client "Daredevil" "Wolverine" "1000" "12" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"
# 4
submit_new_transaction_by_client "Daredevil" "Wolverine" "1000" "13" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"
# 5
submit_new_transaction_by_client "Daredevil" "Wolverine" "1000" "14" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"
# 6
submit_new_transaction_by_client "Daredevil" "Wolverine" "1000" "15" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"
# 7
submit_new_transaction_by_client "Daredevil" "Wolverine" "1000" "16" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"
# 8
submit_new_transaction_by_client "Daredevil" "Wolverine" "1000" "17" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"
# 9
submit_new_transaction_by_client "Daredevil" "Wolverine" "1000" "18" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"
# 10
submit_new_transaction_by_client "Daredevil" "Wolverine" "1000" "19" "${NODE1_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE2_URL}"
submit_exiting_transaction_by_client ${t[*]} "${NODE3_URL}"

# 10 Transactions to the third node
# 1
submit_new_transaction_by_client "Daredevil" "Thor" "12345" "15" "${NODE3_URL}"
# 2
submit_new_transaction_by_client "Daredevil" "Thor" "12345" "16" "${NODE3_URL}"
# 3
submit_new_transaction_by_client "Daredevil" "Thor" "12345" "17" "${NODE3_URL}"
# 4
submit_new_transaction_by_client "Daredevil" "Thor" "12345" "18" "${NODE3_URL}"
# 5
submit_new_transaction_by_client "Daredevil" "Thor" "12345" "19" "${NODE3_URL}"
# 6
submit_new_transaction_by_client "Daredevil" "Thor" "12345" "20" "${NODE3_URL}"
# 7
submit_new_transaction_by_client "Daredevil" "Thor" "12345" "21" "${NODE3_URL}"
# 8
submit_new_transaction_by_client "Daredevil" "Thor" "12345" "22" "${NODE3_URL}"
# 9
submit_new_transaction_by_client "Daredevil" "Thor" "12345" "23" "${NODE3_URL}"
# 10
submit_new_transaction_by_client "Daredevil" "Thor" "12345" "34" "${NODE3_URL}"


# Reach a transactions load consensus on all the nodes:
echo -e && read -n 1 -s -r -p "Reaching a trasactions load consensus. Press any key to continue..." && echo -e

curl -X PUT "${NODE1_URL}/nodes/transactions_consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/transactions_consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/transactions_consensus" -w "\n"

# Mine 1 blocks on the third node.
echo -e && read -n 1 -s -r -p "Mining 1 block on the third node. Press any key to continue..." && echo -e

curl -s -X POST -H "Content-Type: application/json" "${NODE3_URL}/blocks/mine" -w "\n" >> /dev/null


# Reach a blockchain consensus on all nodes:
echo -e && read -n 1 -s -r -p "Reaching a blockchain consensus. Press any key to continue..." && echo -e

curl -X PUT "${NODE1_URL}/nodes/blockchain_consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/blockchain_consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/blockchain_consensus" -w "\n"
curl -X PUT "${NODE1_URL}/nodes/blockchain_consensus" -w "\n"

# Reach a transactions load consensus on all the nodes:
echo -e && read -n 1 -s -r -p "Reaching a trasactions load consensus. Press any key to continue..." && echo -e

curl -X PUT "${NODE1_URL}/nodes/transactions_consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/transactions_consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/transactions_consensus" -w "\n"

# Sync Transactions:
echo -e && read -n 1 -s -r -p "Syncing transactions. Make sure nobody is cheating!!! Press any key to continue..." && echo -e
curl -X PUT "${NODE2_URL}/nodes/sync_full_transactions" -w "\n"
curl -X PUT "${NODE1_URL}/nodes/sync_full_transactions" -w "\n"

# Reach a transactions load consensus on all the nodes:
echo -e && read -n 1 -s -r -p "Reaching a trasactions load consensus. Press any key to continue..." && echo -e

curl -X PUT "${NODE1_URL}/nodes/transactions_consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/transactions_consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/transactions_consensus" -w "\n"

wait