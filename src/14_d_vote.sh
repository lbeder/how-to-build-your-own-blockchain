#!/usr/bin/env bash

trap "exit" INT TERM ERR
trap "kill 0" EXIT

./cleanslate.sh

#get command line options
# n - Number of voters
# o- Vote options - a comma seperated string of options
# h - help message

#set default options:
NUMBER_OF_USERS=5;
VOTE_OPTIONS='yes,no';
MISSING_ARG='';
BASE_PORT=3000;

while getopts :n:o:h option
do
 case "${option}"
 in
 n) NUMBER_OF_USERS=${OPTARG};;
 o) VOTE_OPTIONS=${OPTARG};;
 ?) MISSING_ARG==${OPTARG};;
 esac
done

if [ "$MISSING_ARG" != "" ];
then
    echo '';
    echo 'dvote - usage options: ';
    echo '----------------------';
    echo '-n : Number of voters (integer)';
    echo '-o : Voting options - A string of options seperated by comma (default = yes,no)';
    echo ' ';
    echo ' example:';
    echo "dvote -n 15 -o 'yes,no,maybe'"
    echo ' ';
    exit;
fi
echo 'all is well'

for index in $(eval echo "{0..$((NUMBER_OF_USERS-1))}");
do
    echo processing ${index} of ${NUMBER_OF_USERS};
    echo using port $(($BASE_PORT+$index)) in node "NODE"-${index}

    node ../dist/14_d_vote.js --port=$(($BASE_PORT+$index)) --id="NODE"-${index} &
    sleep 0.5

done






# Register the nodes.
echo -e && read -n 1 -s -r -p "Registering the node. Press any key to continue..." && echo -e

for index in $(eval echo "{0..$((NUMBER_OF_USERS-1))}")
do
    NODE_ID="NODE-${index}"
    NODE_PORT="$(($BASE_PORT+$index))"
    NODE_URL="http://localhost:${NODE_PORT}"

    for to_index in $(eval echo "{0..$((NUMBER_OF_USERS-1))}")
    do
        DESTINATION_URL="http://localhost:$(($BASE_PORT+$to_index))/nodes"
        if [ $index != $to_index ]
        then
            echo registering ${NODE_ID} with port ${NODE_PORT} to node ${NODE_URL};

            curl -v -X POST -H "Content-Type: application/json" -d "{
                \"id\": \"${NODE_ID}\",
                \"url\": \"${NODE_URL}\"
                }" ${DESTINATION_URL} -w "\n"
        fi
    done
done

wait 
exit

# Submit 2 transactions to the first node.
echo -e && read -n 1 -s -r -p "Submitting transactions. Press any key to continue..." && echo -e

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

# Mine 3 blocks on the first node.
echo -e && read -n 1 -s -r -p "Mining blocks. Press any key to continue..." && echo -e

curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"
curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"
curl -X POST -H "Content-Type: application/json" "${NODE1_URL}/blocks/mine" -w "\n"

# Reach a consensus on both of the nodes:
echo -e && read -n 1 -s -r -p "Reaching a consensus. Press any key to continue..." && echo -e

curl -X PUT "${NODE1_URL}/nodes/consensus" -w "\n"
curl -X PUT "${NODE2_URL}/nodes/consensus" -w "\n"

wait
