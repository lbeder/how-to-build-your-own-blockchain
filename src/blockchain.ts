import {Block} from "./block";
import {EventEmitter} from "Eventemitter3";
import {Transaction} from "./transaction";
import BigNumber from "bignumber.js";
import deepEqual = require("deep-equal");
import {clearInterval, setInterval} from "timers";

export interface MiningHandle {
  stop(): void

  newBlockPromise: Promise<Block>
  transactionsCount: number
  lastBlock: number,
  progressEmitter: EventEmitter
}

export class Blockchain {
  // Let's define that our "genesis" block as an empty block, starting from the January 1, 1970 (midnight "UTC").
  public static readonly GENESIS_BLOCK = new Block(0, [], 0, 0, "GENESIS");

  public static readonly DIFFICULTY = 12;
  public static readonly TARGET = 2 ** (256 - Blockchain.DIFFICULTY);

  public static readonly MINING_SENDER = "<COINBASE>";
  public static readonly MINING_REWARD = 500;
  public static readonly MAX_BLOCK_SIZE = 10;

  public nodeId: string;
  public blocks: Array<Block>;
  public transactionPool: Array<Transaction>;

  constructor(nodeId: string) {
    this.blocks = [Blockchain.GENESIS_BLOCK];
    this.nodeId = nodeId;
    this.transactionPool = [];
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

  private handleNewBlock(newBlock: Block, acceptedTransactionsCount: number) {
    this.blocks.push(newBlock);
    this.transactionPool = this.transactionPool.slice(acceptedTransactionsCount);
  }

  public consensus(blockchains: Array<Array<Block>>): boolean {
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
      return true;
    }

    return false;
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

  public verifyTransaction(currTransaction: Transaction): boolean {
    // verifying sender's balance
    let senderBalance = 0;
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      for (let j = 0; j < block.transactions.length; j++) {
        const transaction = block.transactions[j];
        if (currTransaction.isEqual(transaction)) {
          return false;
        }

        // reduce from balance
        if (transaction.senderAddress === currTransaction.senderAddress) {
          senderBalance -= transaction.value;
        }

        // add to balance
        if (transaction.recipientAddress === currTransaction.senderAddress) {
          senderBalance += transaction.value;
        }
      }
    }
    return senderBalance >= currTransaction.value;
  }

  // Mines for block.
  public mineBlock(): MiningHandle {
    let resolve: any;
    const miningPromise = new Promise<Block>(resolver => {
      resolve = resolver;
    });
    const progressEmitter = new EventEmitter();

    // removing non verified transactions from transactionPool
    const relevantTransactions = this.transactionPool.filter(this.verifyTransaction, this);
    this.transactionPool = relevantTransactions;

    const transactions = [
      new Transaction(Blockchain.MINING_SENDER, this.nodeId, Blockchain.MINING_REWARD, '', Date.now().toString()),
      ...this.transactionPool.slice(0, Blockchain.MAX_BLOCK_SIZE - 1)
    ];

    // Create a new block which will "point" to the last block.
    const lastBlock = this.getLastBlock();
    const newBlock = new Block(
      lastBlock.blockNumber + 1,
      transactions,
      Blockchain.now(),
      0,
      lastBlock.sha256()
    );

    let interval: NodeJS.Timer;
    const stop = () => {
      progressEmitter.removeAllListeners();
      clearInterval(interval);
    };
    interval = setInterval(() => {
      const pow = newBlock.sha256();
      // console.log(`Mining #${newBlock.blockNumber}: nonce: ${newBlock.nonce}, pow: ${pow}`);

      if (!(newBlock.nonce % 21)) {
        progressEmitter.emit('progress', {
          pendingBlock: newBlock
        });
      }

      if (Blockchain.isPoWValid(pow)) {
        console.log(`Found valid POW for block ${newBlock.blockNumber}: ${pow}!`);
        newBlock.transactions.forEach((transaction) => {
          console.log('with transaction:', transaction);
        });

        this.handleNewBlock(newBlock, newBlock.transactions.length);
        stop();
        resolve(newBlock);
        return;
      }

      newBlock.nonce++;
    }, 0);

    return {
      stop,
      newBlockPromise: miningPromise,
      transactionsCount: relevantTransactions.length,
      lastBlock: lastBlock.blockNumber,
      progressEmitter
    };
  }

  // Submits new transaction
  public submitTransaction(transaction: Transaction) {
    // TODO: if the sender address already exists in the pool reject the transaction
    this.transactionPool.push(transaction);
  }

  public getLastBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  public getBalance() {
    return this.blocks.reduce((balance, {transactions}) => {
      balance += transactions.reduce((sum, {senderAddress, recipientAddress, value}) => {
        if (senderAddress === this.nodeId) sum -= value;
        if (recipientAddress === this.nodeId) sum += value;
        return sum
      }, 0);
      return balance;
    }, 0);
  }

  public static now(): number {
    return Math.round(new Date().getTime() / 1000);
  }
}
