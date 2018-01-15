export class Blockchain {
  public nodeId: string;
  public blocks: Array<any>;
  public transactionPool: Array<any>;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.blocks = [];
    this.transactionPool = [];
  }

  // Submits new transaction
  public submitTransaction() {
    // TBD
  }

  // Creates new block on the blockchain.
  public createBlock() {
    // TBD
  }
}
