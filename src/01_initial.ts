export class Blockchain {
  private blocks: Array<any>;
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
