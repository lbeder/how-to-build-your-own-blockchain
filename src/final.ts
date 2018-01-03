import { sha256 } from "js-sha256";
import { serialize, deserialize } from "serializer.ts/Serializer";
import BigNumber from "bignumber.js";

import * as fs from "fs";
import * as path from "path";
import deepEqual = require("deep-equal");

import * as uuidv4 from "uuid/v4";
import * as express from "express";
import * as bodyParser from "body-parser";
import { URL } from "url";
import axios from "axios";

import { Set } from "typescript-collections";
import * as parseArgs from "minimist";

export type Address = string;

export class Transaction {
  public senderAddress: Address;
  public recipientAddress: Address;
  public value: number;
  public commision : number;
  public transaction_id: string;
  public signature: string;
  // TODO: add sender signature

  constructor(senderAddress: Address, recipientAddress: Address, value: number,
   commision: number, transaction_id:string, signature: string) {
    this.senderAddress = senderAddress;
    this.recipientAddress = recipientAddress;
    this.value = value;
    this.commision = commision;
    this.transaction_id = transaction_id;
    this.signature = signature;

  }
}

export class Block {
  public blockNumber: number;
  public transactions: Array<Transaction>;
  public numberOfPendingTransactions : number;
  public timestamp: number;
  public nonce: number;
  public prevBlock: string;

  constructor(blockNumber: number, transactions: Array<Transaction>, 
    numberOfPendingTransactions: number, timestamp: number, nonce: number, prevBlock: string) {
    this.blockNumber = blockNumber;
    this.transactions = transactions;
    this.numberOfPendingTransactions = numberOfPendingTransactions
    this.timestamp = timestamp;
    this.nonce = nonce;
    this.prevBlock = prevBlock;
  }

  // Calculates the SHA256 of the entire block, including its transactions.
  public sha256(): string {
    return sha256(JSON.stringify(serialize<Block>(this)));
  }
}

export class Node {
  public id: string;
  public url: URL;

  constructor(id: string, url: URL) {
    this.id = id;
    this.url = url;
  }

  public toString(): string {
      return `${this.id}:${this.url}`;
  }
}

export class Blockchain {
  // Let's define that our "genesis" block as an empty block, starting from the January 1, 1970 (midnight "UTC").
  public static readonly GENESIS_BLOCK = new Block(0, [], 0, 0, 0, "fiat lux");

  public static readonly DIFFICULTY = 4;
  public static readonly TARGET = 2 ** (256 - Blockchain.DIFFICULTY);

  public static readonly MINING_SENDER = "<COINBASE>";
  public static readonly MINING_REWARD = 50;

  public nodeId: string;
  public nodes: Set<Node>;
  public blocks: Array<Block>;
  public transactionPool: Array<Transaction>;
  public minTransactionsLoad: number;
  public maxTransactionsLoad: number;
  private storagePath: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.nodes = new Set<Node>();
    this.transactionPool = [];
    this.minTransactionsLoad = 0;
    this.maxTransactionsLoad = 0;

    this.storagePath = path.resolve(__dirname, "../", `${this.nodeId}.blockchain`);

    // Load the blockchain from the storage.
    this.load();
  }

  // Registers new node.
  public register(node: Node): boolean {
    return this.nodes.add(node);
  }

  // Saves the blockchain to the disk.
  private save() {
    fs.writeFileSync(this.storagePath, JSON.stringify(serialize(this.blocks), undefined, 2), "utf8");
  }

  // Loads the blockchain from the disk.
  private load() {
    try {
      this.blocks = deserialize<Block[]>(Block, JSON.parse(fs.readFileSync(this.storagePath, "utf8")));
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }

      this.blocks = [Blockchain.GENESIS_BLOCK];
    } finally {
      this.verify();
    }
  }

  // Verifies the blockchain.
  public static verify(blocks: Array<Block>): boolean {
    try {
      // The blockchain can't be empty. It should always contain at least the genesis block.
      if (blocks.length === 0) {
        throw new Error("Blockchain can't be empty!");
      }

      // The first block has to be the genesis block.
      if (!deepEqual(blocks[0], Blockchain.GENESIS_BLOCK)) {
        throw new Error("Invalid first block!");
      }

      // Verify the chain itself.
      for (let i = 1; i < blocks.length; ++i) {
        const current = blocks[i];

        // Verify block number.
        if (current.blockNumber !== i) {
          throw new Error(`Invalid block number ${current.blockNumber} for block #${i}!`);
        }

        // Verify that the current blocks properly points to the previous block.
        const previous = blocks[i - 1];
        if (current.prevBlock !== previous.sha256()) {
          throw new Error(`Invalid previous block hash for block #${i}!`);
        }

        // Verify the difficutly of the PoW.
        //
        // TODO: what if the diffuclty was adjusted?
        if (!this.isPoWValid(current.sha256())) {
          throw new Error(`Invalid previous block hash's difficutly for block #${i}!`);
        }
      }

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  // Verifies the blockchain.
  private verify() {
    // The blockchain can't be empty. It should always contain at least the genesis block.
    if (!Blockchain.verify(this.blocks)) {
      throw new Error("Invalid blockchain!");
    }
  }

  // Receives candidate blockchains, verifies them, and if a longer and valid alternative is found - uses it to replace
  // our own.
  public blockchain_consensus(blockchains: Array<Array<Block>>): boolean {
    // Iterate over the proposed candidates and find the longest, valid, candidate.
    let maxLength: number = 0;
    let bestCandidateIndex: number = -1;

    for (let i = 0; i < blockchains.length; ++i) {
      const candidate = blockchains[i];

      // Don't bother validating blockchains shorther than the best candidate so far.
      if (candidate.length <= maxLength) {
        continue;
      }

      // Found a good candidate?
      if (Blockchain.verify(candidate)) {
        maxLength = candidate.length;
        bestCandidateIndex = i;
      }
    }

    // Compare the candidate and consider to use it.
    if (bestCandidateIndex !== -1 && (maxLength > this.blocks.length || !Blockchain.verify(this.blocks))) {
      this.blocks = blockchains[bestCandidateIndex];
      this.remove_consented_transactions();
      this.save();

      return true;
    }

    return false;
  }

  /**
    This method is a simple demonstration of deciding what would be an acceptable number of
    transactions to be included in the next block. Its real implementation would
    match the minTransactionsLoad to a range out of a list of ranges, and choose the acceptable
    number of transactions mapped for the chpsen range.
  **/
  public number_of_transactions_to_be_consented(): number {
    const n = this.minTransactionsLoad;
    if (n < 10)
    {
      return Math.min(5, n);
    }
    if ((10 <= n) &&  (n < 20))
    {
      return Math.min(10, n);
    }
    return Math.min(20, n);
  }

    // Receives candidate transactions lists, verifies them, and agree on the number of transactions
    // to be included in the next block.
    // TODO: add the node ID for each list and save the list 
  public transactions_consensus(transaction_ids_list: Array<Array<string>>): number  {
    // Iterate over the proposed candidates and find the longest, valid, candidate.
    let minLength : number = this.transactionPool.length;
    let maxLength : number = this.transactionPool.length;

    for (let i = 0; i < transaction_ids_list.length; ++i) {
      const candidate = transaction_ids_list[i];
      if (candidate.length < minLength) {
        minLength = candidate.length;
      }
      if (candidate.length > maxLength) {
        maxLength = candidate.length;
      }
    }
      this.maxTransactionsLoad = maxLength;
      this.minTransactionsLoad = minLength;
      
      return minLength;
  }

  // Validates PoW.
  public static isPoWValid(pow: string): boolean {
    try {
      if (!pow.startsWith("0x")) {
        pow = `0x${pow}`;
      }

      return new BigNumber(pow).lessThanOrEqualTo(Blockchain.TARGET.toString());
    } catch {
      return false;
    }
  }

  // Mines for block.
  private mineBlock(transactions: Array<Transaction>, numb_pending_transactions : number): Block {
    // Create a new block which will "point" to the last block.
    const lastBlock = this.getLastBlock();
    // TODO: write the real number of transactions
    const newBlock = new Block(lastBlock.blockNumber + 1, transactions, numb_pending_transactions, Blockchain.now(),
     0, lastBlock.sha256());

    while (true) {
      const pow = newBlock.sha256();

      if (Blockchain.isPoWValid(pow)) {
        console.log(`Found valid POW: ${pow}!`);
        break;
      }

      newBlock.nonce++;
    }

    return newBlock;
  }

  // Submits new transaction
  public submitTransaction(senderAddress: Address, recipientAddress: Address, value: number,
    commision: number, transaction_id: string, signature: string) {
    // TODO: check the transaction isnt dup    
    this.transactionPool.push(new Transaction(senderAddress, recipientAddress, value, commision, transaction_id, signature));
  }

  // Remove all consented transaction from our transaction pool
  public remove_consented_transactions(){
    let consented_transactions : Array<Transaction> = [].concat.apply([], this.blocks.map(block => block.transactions));
    let consented_transactions_ids : Array<string> = consented_transactions.map(t => t.transaction_id);
    
    this.transactionPool =  this.transactionPool.filter(function (tr) {
      return !consented_transactions_ids.find(function (tid){return tid == tr.transaction_id});
    }); 
    console.log(`Node ${this.nodeId}: Now pending ${this.transactionPool.length} transactions.`)
  }

  public choose_lucrative_transactions(n: number): Array<Transaction> {
    if (n <= 0)
    {
      return new Array<Transaction>();
    }

    this.transactionPool.sort(function(x,y){
      return (x.commision > y.commision) ? -1 : ((x.commision < y.commision) ? 1 : 0);});

    return this.transactionPool.slice(0, n);
  }

  // Creates new block on the blockchain.
  public createBlock(): Block {
    // Get the number of transactions to be included in this block
    const number_of_transactions_to_consent = this.number_of_transactions_to_be_consented();
    // Reduce 1 in order to include our prize transaction
    const number_of_transactions_to_take_from_pool = number_of_transactions_to_consent - 1;
    const number_of_pending_transactions = this.transactionPool.length - number_of_transactions_to_take_from_pool;
    const chosen_transactions = this.choose_lucrative_transactions(number_of_transactions_to_take_from_pool);

    console.log(`Mining when number of transactions ranges between ${this.minTransactionsLoad} and ${this.maxTransactionsLoad}`);

    // Add a "coinbase" transaction granting us the mining reward!
    const transaction_id = uuidv4()
    // TODO: sign for real
    const signature = uuidv4()
    const transactions = [new Transaction(Blockchain.MINING_SENDER, this.nodeId, Blockchain.MINING_REWARD, 0, transaction_id, signature),
      ...chosen_transactions];

    // Mine the transactions in a new block.
    const newBlock = this.mineBlock(transactions, number_of_pending_transactions);

    console.log(`Mined a block that contains ${number_of_transactions_to_consent} transactions.`);
    console.log(`Number of pending transactions: ${number_of_pending_transactions}`);

    // Append the new block to the blockchain.
    this.blocks.push(newBlock);

    // Remove the mined transactions.
    this.transactionPool = this.transactionPool.slice(number_of_transactions_to_take_from_pool);
    this.minTransactionsLoad = 0;
    this.maxTransactionsLoad = 0;

    // Save the blockchain to the storage.
    this.save();

    return newBlock;
  }

  public getLastBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  public static now(): number {
    return Math.round(new Date().getTime() / 1000);
  }
}

// Web server:
const ARGS = parseArgs(process.argv.slice(2));
const PORT = ARGS.port || 3000;
const app = express();
const nodeId = ARGS.id || uuidv4();
const blockchain = new Blockchain(nodeId);

// Set up bodyParser:
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);

  res.status(500);
});

// Show all the blocks.
app.get("/blocks", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.blocks));
});

// Show specific block.
app.get("/blocks/:id", (req: express.Request, res: express.Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.json("Invalid parameter!");
    res.status(500);
    return;
  }

  if (id >= blockchain.blocks.length) {
    res.json(`Block #${id} wasn't found!`);
    res.status(404);
    return;
  }

  res.json(serialize(blockchain.blocks[id]));
});

app.post("/blocks/mine", (req: express.Request, res: express.Response) => {
  // Mine the new block.
  const newBlock = blockchain.createBlock();

  res.json(`Mined new block #${newBlock.blockNumber}`);
});

// Show all transactions in the transaction pool.
app.get("/transactions", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.transactionPool));
});

// Show all transactions in the transaction pool.
app.get("/transactions_ids", (req: express.Request, res: express.Response) => {
  const ids = blockchain.transactionPool.map(transaction => transaction.transaction_id);
  res.json(serialize(ids));
});

app.post("/transactions", (req: express.Request, res: express.Response) => {
  const senderAddress = req.body.senderAddress;
  const recipientAddress = req.body.recipientAddress;
  const value = Number(req.body.value);
  const commision = Number(req.body.commision);
  const transaction_id = req.body.transaction_id;
  const signature = req.body.signature;
  
  if (!senderAddress || !recipientAddress || !value || !commision || !transaction_id || !signature)  {
    res.json("Invalid parameters!");
    res.status(500);
    return;
  }

  blockchain.submitTransaction(senderAddress, recipientAddress, value, commision, transaction_id, signature);
  res.json(``)
  res.status(200);
  return;
});

app.get("/nodes", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.nodes.toArray()));
});

app.post("/nodes", (req: express.Request, res: express.Response) => {
  const id = req.body.id;
  const url = new URL(req.body.url);

  if (!id || !url)  {
    res.json("Invalid parameters!");
    res.status(500);
    return;
  }

  const node = new Node(id, url);

  if (blockchain.register(node)) {
    res.json(`Registered node: ${node}`);
  } else {
    res.json(`Node ${node} already exists!`);
    res.status(500);
  }
});

app.put("/nodes/blockchain_consensus", (req: express.Request, res: express.Response) => {
  // Fetch the state of the other nodes.
  const requests = blockchain.nodes.toArray().map(node => axios.get(`${node.url}blocks`));

  if (requests.length === 0) {
    res.json("There are nodes to sync with!");
    res.status(404);

    return;
  }

  axios.all(requests).then(axios.spread((...blockchains) => {
    if (blockchain.blockchain_consensus(blockchains.map(res => deserialize<Block[]>(Block, res.data)))) {
      res.json(`Node ${nodeId} has reached a consensus on a new blockchain state.`);
    } else {
      res.json(`Node ${nodeId} hasn't reached a consensus on the existing blockchain state.`);
    }

    res.status(200);
    return;
  })).catch(err => {
    console.log(err);
    res.status(500);
    res.json(err);
    return;
  });

  res.status(500);
});


app.put("/nodes/transactions_consensus", (req: express.Request, res: express.Response) => {
  // Fetch the state of the other nodes.
  const requests = blockchain.nodes.toArray().map(node => axios.get(`${node.url}transactions_ids`));

  if (requests.length === 0) {
    res.json("There are nodes to sync with!");
    res.status(404);

    return;
  }

  axios.all(requests).then(axios.spread((...transaction_ids_list) => {
    const length = blockchain.transactions_consensus(transaction_ids_list.map(res => deserialize<string[]>(String, res.data)))
      res.json(`Node ${nodeId} has reached a consensus of ${length} on a new transactions state.`);

    res.status(200);
    return;
  })).catch(err => {
    console.log(err);
    res.status(500);
    res.json(err);
    return;
  });

  res.status(500);
});

if (!module.parent) {
  app.listen(PORT);

  console.log(`Web server started on port ${PORT}. Node ID is: ${nodeId}`);
}
