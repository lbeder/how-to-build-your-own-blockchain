export type Address = string;

export class Transaction {
  private senderAddress: Address;
  private recipient: Address;
  private value: number;
}

export class Block {
  private blockNumber: number;
  private transactions: Array<Transaction>;
  private timestamp: number;
  private nonce: number;
  private prevBlock: string;
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
  public submitTransaction() {
    // TBD
  }
}
