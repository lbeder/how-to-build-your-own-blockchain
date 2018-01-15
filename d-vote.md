# how-to-build-your-own-blockchain

This project is based on BLockchain Academy's project as described in (https://www.facebook.com/events/541216486228386/).
Build on top of it, this project demonstrates how secured, transparent and trusted voting can be achieved using blockchain technology.


The following is a list of changes to the original project:
1. Modify shell script to allow running any number of nodes. This is configurable using command line option. 
    
    usage: 14_d_vote [-n numberOfNodes] [-o votingOptions] [-m numberOfVoters] [-k publicKey file name ]

    -n Number of nodes to run (default = 5)
    -o voting options. Comma separated string of voting options 
        (default ='yes,no,abstained')
    -m Number of voters participating (default = 20)
    -k Public key file name used for encrypting the transaction (default - publicKey.pem)

2. We use the 'Transaction to hold a vote' by using the following fields in the transaction:
    senderAddress - stores Voter's id
    value - store the vote
    recipientAddress

3. Modify the 'Transactions' in the block chain to 'Votes'
    Vote have a senderAddress - used to make sure that a voter can only vote once
    The Vote object also has the sender's selected vote - It must be one of the options as defined in the genesis block

4. there is no mining fee involved in the transaction

5. In order for all the nodes to be in sync - each transaction is sent to all other nodes.
    A Node will not accept a new vote in the case where voterId is already in the block chain or in the transaction pool

6. Encrypt/Decrypt part of the transaction 

7. Simulating voting process


So what does the script demonstrate?
====================================
 - Parse the command line options (#n - number of nodes, #m - number of voters, 'o'- and voting options)
 - Spawn the multiple nodes (servers)
 - Register each of the #n nodes with the others
 - Simulate #m voters, randomly voting through randomly selected nodes
 - The blockchain prevents from someone to vote more than once
 - voting is secured, the transactions are encrypted, the decryption key is only availabe at the end of the 
    voting process
 - Upon end of voting, the private key is uploaded to the nodes, and each node can check the vote count

future work
=====================================
- Encrypt sender address to support anonymous voters



New defined API
=====================================
(post) /vote/:voterId/:votingValue - allow a user to vote
(get) /voting_options - gets the available voting options
(post) /end_of_voting - uploads the private key to start decrypting votes and count voting results


example of encrypted blockchain:
==================================
[
    {
        "blockNumber": 0,
        "transactions": [],
        "timestamp": 0,
        "nonce": 0,
        "prevBlock": "yes,no,abstained"
    },
    {
        "blockNumber": 1,
        "transactions": [
            {
                "senderAddress": "<COINBASE>",
                "transactionType": "REWARD",
                "transactionContent": {
                    "recipientAddress": "NODE-1",
                    "value": 50,
                    "vote": ""
                }
            },
            {
                "senderAddress": "0",
                "transactionType": "VOTE",
                "transactionContent": "rNQHXlJ8mzK8XS2rAncYRTduDfYaKfjFIKnvmukah+I6jl1S1HaI7lTz/ANlY506uA/BIcCfTPieHXAF/lwx4RTuVVUd6y59wUecUsLZurgFINej/Qmvu4XyaDktCoHnB2DjVm+8dp7Epi2T2CBvqeV4OSnBsuasW9EaBGDgA7yjD6zj4p1dXeSVjjruycTpv8uvxP6y8iQ6Nv6BEAJp/UTCOlh/MGpCSs5Pvze0tjPN/zzuY8m2r4PXJv/Z9Joy7PDjUIoxv0wBbzVnAkTHtEK7p7WhkW0VTMKyHE5Y4ZCeoVcPxtdS8vIHdPZTcxHm94rcWtYPbEMN8b6NrD/FTw=="
            },
            {
                "senderAddress": "1",
                "transactionType": "VOTE",
                "transactionContent": "G3QHFgIbQVfvWDjjveR1wSAn1XKuL5Hoq0l/obxuL94lp4mDRNiffyI96Akc8tYD0yjK9y2PLfKPUI220Tcc5l1zrpxD02XaNpHdgV7zejdjC9UnJ1TQk7T/bbd8p2OQDscPKQblK8pbwOZufDZyVhg6ciInEMcMIU1tSQnbZ7fiwwCxl9dIE2nVh1c0lbvZYGa2y/rb6j51pEaxrE0Eflk2KG8Uo4RBAdvoK8rpwrNS2lCaBZQ5cLVoGiBfLUq1HB8GmCdyULd95q1q2gZ1TYYOeMY7ZS2w11lw1jubcvG0bKcdyMiVFh90nIwOUOlBUeg2GMA1KXQpCp4cgW3Egg=="
            }
        ]
    }
]

## License

[MIT](LICENSE)
