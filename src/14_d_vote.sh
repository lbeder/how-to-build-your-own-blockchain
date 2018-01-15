#!/usr/bin/env bash

trap "exit" INT TERM ERR
trap "kill 0" EXIT

./cleanslate.sh

#get command line options
# n - Number of voters
# o- Vote options - a comma seperated string of options
# h - help message

#set default options:
NUMBER_OF_NODES=5;
NUMBER_OF_VOTERS=20;
VOTE_OPTIONS='yes,no,abstained';
MISSING_ARG='';
BASE_PORT=3000;
PUBLIC_KEY_FILENAME="publicKey.pem"

while getopts :n:m:o:k:h option
do
 case "${option}"
 in
 n) NUMBER_OF_NODES=${OPTARG};;
 m) NUMBER_OF_VOTERS=${OPTARG};;
 o) VOTE_OPTIONS=${OPTARG};;
 k) PUBLIC_KEY_FILENAME=${OPTARG};;
 ?) MISSING_ARG==${OPTARG};;
 esac
done

if [ "$MISSING_ARG" != "" ];
then
    echo '';
    echo 'dvote - usage options: ';
    echo '----------------------';
    echo '-n : Number of nodes (integer)';
    echo '-m : Number of voters (integer)';
    echo '-o : Voting options - A string of options seperated by comma (default = yes,no)';
    echo '-k : public key file name'
    echo ' ';
    echo ' example:';
    echo "dvote -n 6 -m 15 -o 'yes,no,maybe'"
    echo ' ';
    exit;
fi
echo 'all is well'

#generate public and private keys to secure the voting process
openssl genrsa -out ../privatekey.pem 2048
openssl rsa -in ../privatekey.pem -pubout -out ../${PUBLIC_KEY_FILENAME}

for index in $(eval echo "{0..$((NUMBER_OF_NODES-1))}");
do
    echo processing ${index} of ${NUMBER_OF_NODES};
    echo using port $(($BASE_PORT+$index)) in node "NODE"-${index}

    node ../dist/14_d_vote.js --port=$(($BASE_PORT+$index)) --id="NODE"-${index} --voting_options="${VOTE_OPTIONS}" --public_key_filename="${PUBLIC_KEY_FILENAME}" &
    sleep 0.5

done






################################
# Register the nodes.
echo -e && read -n 1 -s -r -p "Registering the node. Press any key to continue..." && echo -e

for index in $(eval echo "{0..$((NUMBER_OF_NODES-1))}")
do
    NODE_ID="NODE-${index}"
    NODE_PORT="$(($BASE_PORT+$index))"
    NODE_URL="http://localhost:${NODE_PORT}"

    for to_index in $(eval echo "{0..$((NUMBER_OF_NODES-1))}")
    do
        DESTINATION_URL="http://localhost:$(($BASE_PORT+$to_index))/nodes"
        if [ $index != $to_index ]
        then
            echo registering ${NODE_ID} with port ${NODE_PORT} to node ${DESTINATION_URL};

            curl -X POST -H "Content-Type: application/json" -d "{
                \"id\": \"${NODE_ID}\",
                \"url\": \"${NODE_URL}\"
                }" ${DESTINATION_URL} -w "\n"
        fi
    done
done

################################
# Start voting simulation
echo -e && read -n 1 -s -r -p "Press any key to start voting..." && echo -e

## declare an array of voting options
IFS=', ' read -r -a voting_options_arr <<< $VOTE_OPTIONS

for index in $(eval echo "{0..$((NUMBER_OF_VOTERS-1))}")
do
    #Randommally select a node
    node=$(( $RANDOM % $NUMBER_OF_NODES )); #echo $node

    #Randommally select a voting option
    idx=$(( $RANDOM % ${#voting_options_arr[@]} )); 
    echo ${voting_options_arr[$idx]};

    #send a random vote to a random node
    DESTINATION_URL="http://localhost:$(($BASE_PORT+$node))/vote"

    echo voting ${voting_options_arr[$idx]} using node at url: http://localhost:$(($BASE_PORT+$node))/vote;

     curl -X POST -H "Content-Type: application/json" -d "{
         \"voterId\": \"${index}\",
         \"votingValue\": \"${voting_options_arr[$idx]}\"
         }" ${DESTINATION_URL} -w "\n"

done

sleep 1



# Mine 3 blocks on the first node.
echo -e && read -n 1 -s -r -p "Mining blocks. Press any key to start mining..." && echo -e
echo "{0..$(((NUMBER_OF_NODES-1)/2))}"
echo "starting loop"
#for index in $(eval echo "{0..$((NUMBER_OF_NODES-1))}")

for index in $(eval echo "{0..$(( $NUMBER_OF_NODES - 1 ))}")
do
    echo "Mining Node ${index}"
    NODE_ID="NODE-${index}"
    NODE_PORT="$(($BASE_PORT+$index))"
    NODE_URL="http://localhost:${NODE_PORT}"

    curl -X POST -H "Content-Type: application/json" "${NODE_URL}/blocks/mine" -w "\n"

done



# Reach a consensus on both of the nodes:
echo -e && read -n 1 -s -r -p "Reaching a consensus. Press any key to continue..." && echo -e

for index in $(eval echo "{0..$(( $NUMBER_OF_NODES - 1 ))}")
do

    NODE_PORT="$(($BASE_PORT+$index))"
    NODE_URL="http://localhost:${NODE_PORT}"

    curl -X PUT "${NODE_URL}/nodes/consensus" -w "\n"

done

# End of voting - send the private key to the node to start counting votes:
echo -e && read -n 1 -s -r -p "Press any key to end voting..." && echo -e

     curl -F "keyfile=@../privatekey.pem" "${NODE_URL}/end_of_voting"

wait
exit

