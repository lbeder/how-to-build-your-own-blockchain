My implementation is a small (microcosmos) for a lightning network.

The lightning network is an off-chain network, another layer on top of the blockchain, that allows nodes to transact with each other through a channel without submitting those transactions to the blockchain itself. But they can however decide to broadcast the final state of the channel whenever they want.
I implemented a small version of lightning network - meaning it is not a real network but a 1on1 network. Every channel can be shared by only 2 nodes, and that's why it's called
a Bi-direcational channel.

This idea is about to solve the main problem with bitcoin network, which is this scalability. With a version of lightning network nodes can transact as many times as they want, and at the end, only 3 transaction are being broadcasted to the blockchain - 2 first funding transactions of each party of the channel, and last transaction that summerize the transactions and finalize the channel.

This solution consists of few features -

1. I started by refactoring the code by moduling it to classes.
2. the lightning network is saved and shared by all parties of the network, which means each time they connect, and do actions, they will be synced.
3. The lightning network contains a data structure of Bi-direcational channels, pending and active. And also contains the state of the channels balance (transaction) of each node.
Meaning that each node can be part of few bi-direcational channels and see the transactions (and by that the balance state of his channels).
4. When a party wants to end the channel connection, he will broadcast the state of the channel (a transaction) to the blockchain, according the rules of the lightning network:
	a) the other party will get the value that the first party sent him, but with s amsrt contract that allows him to mine this transaction only after a pre-defined number of blocks
		to wait.
	b) the sending party will get his amount immediately.
	
*By the time that a party broadcasts a transaction he can continue transacting with the other party, according to the channel funding amount, as long as he wants.


In order to run it you may follow few steps (postman collection attached):

pre-steps:
----------
connect with 2 nodes, with different port and nodeId. for example:

a. node ../dist/RequestHandler.js --PORT=3000 --id=23f1bf2b-70ab-4b4e-96d4-818200ebfbc
b. node ../dist/RequestHandler.js --PORT=3001 --id=128cccee-01fb-45ad-b4cf-0928a74aaa0

steps:
----------
1. POST openChannel - initiating the bi-dirrectional channel by party A
2. POST joinChannel - the same request but with party B, which signs on the channel and makes it an active channel
3. POST submitTransaction - this step can be repeated as much as each party wants and basically transact for ever, without interrupting the blockchain.
4. POST broadcastToBlockchain

After step 4, the final transactions are on the blockchain, ready to be mined.
Now you can follow up with the original consensus request, and see that the other party will get his transaction only after 10 blocks.
