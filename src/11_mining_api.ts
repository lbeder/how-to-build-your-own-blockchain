import { sha256 } from "js-sha256";
import { serialize, deserialize } from "serializer.ts/Serializer";
import BigNumber from "bignumber.js";

import * as fs from "fs";
import * as path from "path";
import deepEqual = require("deep-equal");

import * as uuidv4 from "uuid/v4";
import * as express from "express";
import * as bodyParser from "body-parser";

export type Address = string;

export class Transaction {
  public senderAddress: Address;
  public recipientAddress: Address;
  public value: number;

  constructor(senderAddress: Address, recipientAddress: Address, value: number) {
    this.senderAddress = senderAddress;
    this.recipientAddress = recipientAddress;
    this.value = value;
  }
}

export class Block {
  public blockNumber: number;
  public transactions: Array<Transaction>;
  public timestamp: number;
  public nonce: number;
  public prevBlock: string;

  constructor(blockNumber: number, transactions: Array<Transaction>, timestamp: number, nonce: number,
    prevBlock: string) {
    this.blockNumber = blockNumber;
    this.transactions = transactions;
    this.timestamp = timestamp;
    this.nonce = nonce;
    this.prevBlock = prevBlock;
  }

  // Calculates the SHA256 of the entire block, including its transactions.
  public sha256(): string {
    return sha256(JSON.stringify(serialize<Block>(this)));
  }
}

export class Blockchain {
  // Let's define that our "genesis" block as an empty block, starting from the January 1, 1970 (midnight "UTC").
  public static readonly GENESIS_BLOCK = new Block(0, [], 0, 0, "fiat lux");

  public static readonly DIFFICULTY = 4;
  public static readonly TARGET = 2 ** (256 - Blockchain.DIFFICULTY);

  public static readonly MINING_SENDER = "<COINBASE>";
  public static readonly MINING_REWARD = 50;

  public nodeId: string;
  public blocks: Array<Block>;
  public transactionPool: Array<Transaction>;
  private storagePath: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.transactionPool = [];

    this.storagePath = path.resolve(__dirname, "../", `${this.nodeId}.blockchain`);

    // Load the blockchain from the storage.
    this.load();
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
  private verify() {
    // The blockchain can't be empty. It should always contain at least the genesis block.
    if (this.blocks.length === 0) {
      throw new Error("Blockchain can't be empty!");
    }

    // The first block has to be the genesis block.
    if (!deepEqual(this.blocks[0], Blockchain.GENESIS_BLOCK)) {
      throw new Error("Invalid first block!");
    }

    // Verify the chain itself.
    for (let i = 1; i < this.blocks.length; ++i) {
      const current = this.blocks[i];

      // Verify block number.
      if (current.blockNumber !== i) {
        throw new Error(`Invalid block number ${current.blockNumber} for block #${i}!`);
      }

      // Verify that the current blocks properly points to the previous block.
      const previous = this.blocks[i - 1];
      if (current.prevBlock !== previous.sha256()) {
        throw new Error(`Invalid previous block hash for block #${i}!`);
      }

      // Verify the difficutly of the PoW.
      //
      // TODO: what if the diffuclty was adjusted?
      if (!Blockchain.isPoWValid(current.sha256())) {
        throw new Error(`Invalid previous block hash's difficutly for block #${i}!`);
      }
    }
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
  private mineBlock(transactions: Array<Transaction>): Block {
    // Create a new block which will "point" to the last block.
    const lastBlock = this.getLastBlock();
    const newBlock = new Block(lastBlock.blockNumber + 1, transactions, Blockchain.now(), 0, lastBlock.sha256());

    while (true) {
      const pow = newBlock.sha256();
      console.log(`Mining #${newBlock.blockNumber}: nonce: ${newBlock.nonce}, pow: ${pow}`);

      if (Blockchain.isPoWValid(pow)) {
        console.log(`Found valid POW: ${pow}!`);
        break;
      }

      newBlock.nonce++;
    }

    return newBlock;
  }

  // Submits new transaction
  public submitTransaction(senderAddress: Address, recipientAddress: Address, value: number) {
    this.transactionPool.push(new Transaction(senderAddress, recipientAddress, value));
  }

  // Creates new block on the blockchain.
  public createBlock(): Block {
    // Add a "coinbase" transaction granting us the mining reward!
    const transactions = [new Transaction(Blockchain.MINING_SENDER, this.nodeId, Blockchain.MINING_REWARD),
      ...this.transactionPool];

    // Mine the transactions in a new block.
    const newBlock = this.mineBlock(transactions);

    // Append the new block to the blockchain.
    this.blocks.push(newBlock);

    // Remove the mined transactions.
    this.transactionPool = [];

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

// Web server
const PORT = 3000;
const app = express();
const nodeId = uuidv4();
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

app.post("/transactions", (req: express.Request, res: express.Response) => {
  const senderAddress = req.body.senderAddress;
  const recipientAddress = req.body.recipientAddress;
  const value = Number(req.body.value);

  if (!senderAddress || !recipientAddress || !value)  {
    res.json("Invalid parameters!");
    res.status(500);
    return;
  }

  blockchain.submitTransaction(senderAddress, recipientAddress, value);

  res.json(`Transaction from ${senderAddress} to ${recipientAddress} was added successfully`);
});

if (!module.parent) {
  app.listen(PORT);

  console.log(`Web server started on port ${PORT}. Node ID is: ${nodeId}`);
}
