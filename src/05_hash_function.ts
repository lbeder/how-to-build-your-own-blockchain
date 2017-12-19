import { sha256 } from "js-sha256";
import { serialize } from "serializer.ts/Serializer";

export type Address = string;

export class Transaction {
  private senderAddress: Address;
  private recipientAddress: Address;
  private value: number;

  constructor(senderAddress: Address, recipientAddress: Address, value: number) {
    this.senderAddress = senderAddress;
    this.recipientAddress = recipientAddress;
    this.value = value;
  }
}

export class Block {
  private blockNumber: number;
  private transactions: Array<Transaction>;
  private timestamp: number;
  private nonce: number;
  private prevBlock: string;

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
  private blocks: Array<Block>;
  private transactionPool: Array<Transaction>;

  constructor() {
    this.blocks = [];
    this.transactionPool = [];
  }

  // Creates new block on the blockchain.
  public createBlock() {
    // TBD
  }

  // Submits new transaction
  public submitTransaction(senderAddress: Address, recipientAddress: Address, value: number) {
    this.transactionPool.push(new Transaction(senderAddress, recipientAddress, value));
  }
}
