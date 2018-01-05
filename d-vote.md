# how-to-build-your-own-blockchain

This project is based on BLockchain Academy's project as described in (https://www.facebook.com/events/541216486228386/).
Build on top of it, this project demonstrates how secured, transparent and trusted voting can be achieved using blockchain technology.


The following is a list of changes to the original project:
1. Modify shell script to allow running any number of nodes. This is configurable using command line option. 
    
    
    
    usage 14_d_vodes [-n numberOfNodes] [-o votingOptions]

    -n Number of nodes to run (default = 5)
    -o voting options. Comma seperated string of voting options (default ='yes,no')


2. We use the 'Transaction to hold a vote' by using the following fields in the transaction:
    senderAddress - stores Voter's id
    value - store the vote
    recipientAddress

Modify the 'Transactions' in the block chain to 'Votes'
    Vote have a senderAddress - used to make sure that a voter can only vote once
    The Vote object also has the sender's selected vote - It must be one of the options as defined in the genesis block

3. there is no mining fee involved in the transaction

4. In order for all the nodes to be in sync - each transaction is sent to all other     nodes



So what does the script demonstrate?
====================================
 - Parse the command line options (#n - number of nodes, and voting options)
 - Spawn the multiple nodes (servers)
 - Resgister each of the #n nodes with the others
 - Simulate #m voters, randomaly voting through randomally selected node

Step one
New defined API
/Vote/:voterId/:votingValue - 

## License

[MIT](LICENSE)
