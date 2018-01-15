#!/usr/bin/env bash

# We deploy a smart contract which represents a DAO voting process.
# Authorized members of the DAO will vote on who gets a Bonus.
# When the vote is over, the contract will emit a transaction which
# sends funds to the elected winner.

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
 \"balance\": 500,
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

echo -e && read -n 1 -s -r -p "Deploying DAOBonusVoting. Press any key to continue... " && echo -e

# DAOBONUSVOTING DEMO ****************************************

# Propogate DAOBonusVoting Contract
curl -X POST -H "Content-Type: application/json" -d '{
	"address": "DAOBonusVoting",
	"balance": 400,
	"type": "CONTRACT_ACCOUNT",
	"data": "({ balance: 400, id: 3, authorizedVoters: [{ nodeId: \"A\", address: \"Alice\" }, { nodeId: \"B\", address: \"Eve\" }, { nodeId: \"C\", address: \"Gal Gadot\" }], votes: [{ nodeId: \"C\", address: \"Gal Gadot\", votes: 0 }, { nodeId: \"C\", address: \"Ben Affleck\", votes: 0 }], fromAddress: \"Bob\", candidateA: { nodeId: \"C\", address: \"Gal Gadot\" }, candidateB: { nodeId: \"A\", address: \"Selena Gomez\" }, call: function() { return { getBalance: this.balance, getFromAddress: this.fromAddress };}, send: function() { return { moveFunds: this.changeBalance }; }, moveFunds: function(userData, vote) { const authorizedVoterIdx = this.authorizedVoters.findIndex( user => user.nodeId === userData.nodeId && user.address === userData.address); if (authorizedVoterIdx === -1) return null; const candidateIndex = this.votes.findIndex(candidate => candidate.address === vote); if (candidateIndex === -1) return null; this.votes[candidateIndex].votes++; this.authorizedVoters.splice(authorizedVoterIdx, 1); if (this.authorizedVoters.length > 0) return; this.votes.sort((voteA, voteB) => voteB.votes - voteA.votes); return { senderNodeId: \"B\", senderAddress: \"Bob\", recipientNodeId: this.votes[0].nodeId, recipientAddress: this.votes[0].address, value: 400, action: \"TRANSACTION_EXTERNAL_ACCOUNT\"};} })"
}' "${NODE1_URL}/propogateContract" -w "\n" 

curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"

echo -e && read -n 1 -s -r -p "Attempting to reach consensus. Press any key to continue... " && echo -e

curl -X PUT "${NODE1_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/consensus" -w "\n"

echo -e && read -n 1 -s -r -p "Alice casts a vote for Gal Gadot. Press any key to continue..." && echo -e

# Mutate DAOBonusVoting state
curl -X PUT -H "Content-Type: application/json" -d '{
  "initiaterNode": "A",
  "initiaterAddress": "Alice",
  "value": 0,
  "methodType": "sendable",
  "method": "moveFunds",
  "args": [{ "nodeId": "A", "address": "Alice" }, "Gal Gadot"],
  "action": "mutate_contract"
}' "${NODE1_URL}/mutateContract/DAOBonusVoting" -w "\n"

curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"

echo -e && read -n 1 -s -r -p "Attempting to reach consensus on 1st casted vote. Press any key to continue... " && echo -e

curl -X PUT "${NODE1_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/consensus" -w "\n"

sleep 1


echo -e && read -n 1 -s -r -p "Eve casts a vote for Gal Gadot. Press any key to continue..." && echo -e

# Mutate DAOBonusVoting state
curl -X PUT -H "Content-Type: application/json" -d '{
  "initiaterNode": "B",
  "initiaterAddress": "Eve",
  "value": 0,
  "methodType": "sendable",
  "method": "moveFunds",
  "args": [{ "nodeId": "B", "address": "Eve" }, "Gal Gadot"],
  "action": "mutate_contract"
}' "${NODE2_URL}/mutateContract/DAOBonusVoting" -w "\n"

curl -X POST -H "Content-Type: application/json" "${NODE2_URL}/blocks/mine" -w "\n"

sleep 1

echo -e && read -n 1 -s -r -p "Attempting to reach consensus on 2st casted vote. Press any key to continue... " && echo -e

curl -X PUT "${NODE2_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE1_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE3_URL}/nodes/consensus" -w "\n"

echo -e && read -n 1 -s -r -p "Gal Gadot casts a vote for Ben Affleck. Press any key to continue..." && echo -e

# Mutate DAOBonusVoting state
curl -X PUT -H "Content-Type: application/json" -d '{
  "initiaterNode": "C",
  "initiaterAddress": "Gal Gadot",
  "value": 0,
  "methodType": "sendable",
  "method": "moveFunds",
  "args": [{ "nodeId": "C", "address": "Gal Gadot" }, "Ben Affleck"],
  "action": "mutate_contract"
}' "${NODE3_URL}/mutateContract/DAOBonusVoting" -w "\n"

curl -X POST -H "Content-Type: application/json" "${NODE3_URL}/blocks/mine" -w "\n"

sleep 1

echo -e && read -n 1 -s -r -p "Attempting to reach consensus. Press any key to continue... " && echo -e

curl -X PUT "${NODE3_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE1_URL}/nodes/consensus" -w "\n"

echo -e && read -n 1 -s -r -p "View who won the Bonus Vote in mempool for Node C (3002). Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" "${NODE3_URL}/blocks/mine" -w "\n"

curl -X PUT "${NODE3_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE1_URL}/nodes/consensus" -w "\n"

echo -e && read -n 1 -s -r -p "Gal Gadot won the bonus of 400 coins! Check out her new balance! Press any key to continue..." && echo -e

wait


