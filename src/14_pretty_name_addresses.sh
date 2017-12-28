#!/usr/bin/env bash
bold=$(tput bold)

red=$(tput setaf 1)
green=$(tput setaf 76)

reset=$(tput sgr0)

trap "exit" INT TERM ERR
trap "kill 0" EXIT

# rebuild the distribution
npm run build

./cleanslate.sh

# Start the node.
NODE1="test"
NODE1_PORT=3000
NODE1_URL="http://localhost:${NODE1_PORT}"

node ../dist/final.js --port=${NODE1_PORT} --id=${NODE1} &

sleep 2

# adding 2 addresses
echo -e && read -n 1 -s -r -p "${bold}${green}✔ Adding 2 addresses that will serve as receiver and sender. Press any key to continue...${reset}" && echo -e

curl -X PUT -H "Content-Type: application/json" -d '{
 "prettyName": "ohads-personal"
}' "${NODE1_URL}/address" -w "\n"

curl -X PUT -H "Content-Type: application/json" -d '{
 "prettyName": "ohads-business"
}' "${NODE1_URL}/address" -w "\n"


# Submit 2 transactions to the first node.
echo -e && read -n 1 -s -r -p "${bold}${green}✔ Submitting 2 valid transactions. Press any key to continue...${reset}" && echo -e

curl -X POST -H "Content-Type: application/json" -d '{
 "senderPrettyName": "ohads-personal",
 "recipientPrettyName": "ohads-business",
 "value": "100"
}' "${NODE1_URL}/transactions" -w "\n"

curl -X POST -H "Content-Type: application/json" -d '{
 "senderPrettyName": "ohads-business",
 "recipientPrettyName": "ohads-personal",
 "value": "50"
}' "${NODE1_URL}/transactions" -w "\n"


echo -e && read -n 1 -s -r -p "${bold}${green}✔ now adding a non valid transaction to a fake-address, EXPECTING AN ERROR. Press any key to continue...${reset}" && echo -e

curl -X POST -H "Content-Type: application/json" -d '{
 "senderPrettyName": "fake-address",
 "recipientPrettyName": "ohads-business",
 "value": "100"
}' "${NODE1_URL}/transactions" -w "\n"

echo -e && read -n 1 -s -r -p "${bold}${green}✔ now adding a non valid transaction to from an address to itself, EXPECTING AN ERROR. Press any key to continue...${reset}" && echo -e

curl -X POST -H "Content-Type: application/json" -d '{
 "senderPrettyName": "ohads-business",
 "recipientPrettyName": "ohads-business",
 "value": "50"
}' "${NODE1_URL}/transactions" -w "\n"



# Mine 1 block.
echo -e && read -n 1 -s -r -p "${bold}${green}✔ Mining blocks to make sure we didn't break anything. Press any key to continue...${reset}" && echo -e

curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"


echo "${bold}${green}✔ done. happy.${reset}"