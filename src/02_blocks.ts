export class Block {
  public blockNumber: number;
  public transactions: Array<any>;
  public timestamp: number;
  public nonce: number;
  public prevBlock: string;
}

export class Blockchain {
  public nodeId: string;
  public blocks: Array<Block>;
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
