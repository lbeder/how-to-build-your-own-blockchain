I implemented the following features:

1) Refactored code - the code is moduled to several classes. The request-response API is located in APIWebServer.ts.

2) Added transaction message - added meta data for each transaction. The transaction message can provide more information regarding the transaction, such as the purpose of the transaction.
example: "I sent Jon 5$ for the movie tickets"

3) Added transaction fee - each transaction must have a transaction fee assigned to it. Miners have the option to select the transactions they wish to mine from the mempool. The selection is based on a fee threshold each miner sets per mining session(per block), and only transactions with higher fees than the threshold are mined. The transactions that are not mined, remain in the mempool.

4) Added difficulty adjustment and re-targeting - the difficulty number used in the blockchain target number needs to be dynamic. When the network lacks miners, the mining process should be easier in order to create blocks and obtain the demand. On the other hand, when the network has many miners, mining a block should be more difficult.
    The difficulty is computed by comparing the average creation time of the last 5 blocks (this number is 
configurable) to the average creation time of the 5 previous ones. If there is a major change (the average creation time is x1.5 longer/shorter), the mining difficulty is adjusted accordingly (added/subtracted 1) causing the target to be more suitable for the miners state.
The POW validation process relies on the target number. As the difficulty is dynamically modified, so is the target. Therefore, the difficulty is saved per block, and it is easy to compute the correct target to verify the POW process.

5) Added wallets - added wallets to the blockchain. Transactions can be executed only if they are signed by addresses from wallets that the blockchain contains. Each wallet contains its incoming and outgoing transactions, so its easy to explore transactions related to wallets.

6) Added 2-0f-3 multisig wallets and transactions - added wallets that support multisig. These are special wallets that provide 2-of-3 transactions. Three valid public keys(representing wallets in our blockchain) generate a multisig address that is used to create a multisig wallet.
To create a multisig transaction, one needs to sign the transaction with 2 of 3 private keys that belong to the wallets containing the 3 public keys used to generate the multisig wallets' address. If this happens, the transaction is executed. If the private keys dont match or are not provided, the transaction is not executed.


Postman collection explanation:

	1. POST /createWallet - creates a regular wallet.
	2. GET /wallets - return all the wallets assigned to the network.
	3. POST /createMultiSigWallet - creates a multisig wallet.
	4. POST /multisigtransactoin - creates a multisig transaction.
	5. POST /transactions - creates a regular transaction.
	6. GET /transactions - gets all transactions in the mempool.
	7. POST /blocks/mine - mines a block. only transactions above the listed trx threshold are mined in the block.
	8. GET /blocks - returns the blocks in the network.
	9. GET /nodes - returns the nodes listed in the network.
	10. POST /nodes - registers a new node to the network.
	11. PUT /consensus - runs consensus among nodes.
	

