export class Block {
  private blockNumber: number;
  private transactions: Array<any>;
  private timestamp: number;
  private nonce: number;
  private prev_block: string;
}

export class Blockchain {
  private blocks: Array<Block>;
  private transactionPool: Array<any>;

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
