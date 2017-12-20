import { sha256 } from "js-sha256";
import { serialize } from "serializer.ts/Serializer";
import BigNumber from "bignumber.js";

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

  private blocks: Array<Block>;
  private transactionPool: Array<Transaction>;

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
  public createBlock() {
    // TBD
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

const blockchain = new Blockchain();

const txn1 = new Transaction("Alice", "Bob", 1000);
const txn2 = new Transaction("Alice", "Eve", 12345);
const block = blockchain.mineBlock([txn1, txn2]);
console.log(`Mined block: ${JSON.stringify(serialize(block))}`);
console.log(`Mined block with: ${block.sha256()}`);

