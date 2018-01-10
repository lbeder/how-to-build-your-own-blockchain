#!/usr/bin/env bash

function register_node {

curl -X POST -H "Content-Type: application/json" -d "{
 \"id\": \"${2}\",
 \"url\": \"${3}\"
}" "${1}/nodes" -w "\n"
}

function submit_new_transaction_by_client {
	transaction_id=$(cat /proc/sys/kernel/random/uuid)
	#TODO: Sign for real
	signature=$(cat /proc/sys/kernel/random/uuid)
	curl -s -X POST -H "Content-Type: application/json" -d @<(cat <<EOF
	{
	 "senderAddress": "${1}",
	 "recipientAddress": "${2}",
	 "value": "${3}",
	 "commision": "${4}",
	 "transaction_id": "${transaction_id}",
	 "signature": "${signature}"
	}
EOF
) "${5}/transactions" -w "\n" > /dev/null
t=("${1}" "${2}" "${3}" "${4}" "${transaction_id}" "${signature}")
}

function submit_exiting_transaction_by_client {
	curl -s -X POST -H "Content-Type: application/json" -d @<(cat <<EOF
	{
	 "senderAddress": "${1}",
	 "recipientAddress": "${2}",
	 "value": "${3}",
	 "commision": "${4}",
	 "transaction_id": "${5}",
	 "signature": "${6}"
	}
EOF
) "${7}/transactions" -w "\n" > /dev/null
}

