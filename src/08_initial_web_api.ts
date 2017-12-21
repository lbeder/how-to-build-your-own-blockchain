import { sha256 } from "js-sha256";
import { serialize } from "serializer.ts/Serializer";
import BigNumber from "bignumber.js";
import * as uuidv1 from "uuid/v1";

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

  public sha256(): string {
    return sha256(JSON.stringify(serialize(this)));
  }
}

export class Blockchain {
  // Let's define that our "genesis" block is empty.
  static readonly GENESIS_BLOCK = new Block(0, [], Blockchain.now(), 0, "");

  static readonly DIFFICULTY = 4;
  static readonly TARGET = 2 ** (256 - Blockchain.DIFFICULTY);

  public blocks: Array<Block>;
  public transactionPool: Array<Transaction>;

  constructor() {
    this.blocks = [Blockchain.GENESIS_BLOCK];
    this.transactionPool = [];
  }

  // Mines for block.
  public mineBlock(transactions: Array<Transaction>): Block {
    const lastBlock = this.getLastBlock();

    const newBlock = new Block(lastBlock.blockNumber + 1, transactions, Blockchain.now(), 0, lastBlock.sha256());

    newBlock.nonce = 0;

    while (true) {
      const pow = newBlock.sha256();
      console.log(`Mining block #${newBlock.blockNumber}, using nonce of ${newBlock.nonce}: \n\t${pow}`);

      if (this.isPoWValid(pow)) {
        console.log(`Found valid POW: ${pow}!`);
        break;
      }

      newBlock.nonce++;
    }

    return newBlock;
  }

  // Validates PoW.
  public isPoWValid(pow: string): boolean {
    try {
      return new BigNumber(`0x${pow}`).lessThanOrEqualTo(Blockchain.TARGET.toString());
    } catch {
      return false;
    }
  }

  // Creates new block on the blockchain.
  public createBlock(): Block {
    // Mine the transactions in a new block.
    const newBlock = this.mineBlock(this.transactionPool);

    // Append the new block to the blockchain.
    this.blocks.push(newBlock);

    // Remove the mined transactions.
    this.transactionPool = [];

    return newBlock;
  }

  // Submits new transaction
  public submitTransaction(senderAddress: Address, recipientAddress: Address, value: number) {
    this.transactionPool.push(new Transaction(senderAddress, recipientAddress, value));
  }

  public getLastBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  static now(): number {
    return Math.round(new Date().getTime() / 1000);
  }
}

// Web server
const app = express();
const blockchain = new Blockchain();
const nodeId = uuidv1();

// Set up bodyParser;
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
  const id = req.params.id;

  if (id >= blockchain.blocks.length) {
    res.status(404);
    res.json(`Block #${id} wasn't found!`);
    return;
  }

  res.json(serialize(blockchain.blocks[id]));
});

// Show all transactions in the transaction pool.
app.get("/transactions", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.transactionPool));
});

app.post("/transactions/new", (req: express.Request, res: express.Response) => {
    // var name = req.body.name,
    //     color = req.body.color;
    // ...
});

if (!module.parent) {
  app.listen(3000);

  console.log(`Web server started on port 3000. Node is: ${nodeId}`);
}
