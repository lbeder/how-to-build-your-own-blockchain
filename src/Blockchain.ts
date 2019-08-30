import {Address} from "./Address";
import {Transaction} from "./Transaction";
import {Block} from "./Block";
import {BlockchainUtils} from "./BlockchainUtils";
import {Wallet} from "./Wallet";
import {Node} from "./Node";
import { serialize, deserialize } from "serializer.ts/Serializer";
import { Set } from "typescript-collections";
import * as fs from "fs";
import * as path from "path";
import deepEqual = require("deep-equal");
import { log } from "util";

export class Blockchain {
  // Let's define that our "genesis" block as an empty block, starting from the January 1, 1970 (midnight "UTC").
  public static readonly INITIAL_DIFFICULTY = 4;
  public static readonly MAX_DIFFICULTY = 255;
  public static readonly MIN_DIFFICULTY = 1;
  public static readonly INITIAL_TARGET = 2 ** (256 - Blockchain.INITIAL_DIFFICULTY);
  public static readonly GENESIS_BLOCK = new Block(0, [], 0, 0, "fiat lux", Blockchain.INITIAL_TARGET);
  public static readonly MINING_SENDER = "<COINBASE>";
  public static readonly MINING_REWARD = 50;
  public static readonly DIFFICULTY_SAMPLE_SIZE = 10;
  public static readonly DIFFICULTY_FACTOR = 1.5;

  public nodeId: string;
  public nodes: Set<Node>;
  public blocks: Array<Block>;
  public wallets : Array<Wallet>;
  public transactionPool: Array<Transaction>;
  private storagePath: string;
  private difficulty: number;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.nodes = new Set<Node>();
    this.transactionPool = [];
    this.wallets = [];

    this.storagePath = path.resolve(__dirname, "../", `${this.nodeId}.blockchain`);

    // Load the blockchain from the storage.
    this.load();
    // setting the latest difficulty according to the last block
    this.difficulty = this.getLatestDifficulty();

  }

  // Registers new node.
  public register(node: Node): boolean {
    return this.nodes.add(node);
  }

  public registerWallet(wallet: Wallet) {
    return this.wallets.push(wallet);
  }

  public removeWallet(wallet: Wallet) {
    const index = this.wallets.indexOf(wallet);
    this.wallets.splice(index,1);
  }

  public validateMultiSigPublicKeys(publicKey_A: Address,publicKey_B: Address, publicKey_C: Address) {
    const relevantWallets = this.wallets.filter(w => w.publicKey.id == publicKey_A.id || 
      w.publicKey.id == publicKey_B.id ||w.publicKey.id == publicKey_C.id);

    if(relevantWallets.length != 3){
      return false;
    }

    return true;
  }

  public validateMultiSigTransaction(publicKey_A: Address,publicKey_B: Address, publicKey_C: Address,
    privateKey1: Address, privateKey2: Address) {

    if(this.validateMultiSigPublicKeys(publicKey_A, publicKey_B, publicKey_C)) {
      const matchedPrivateKeys = this.wallets.filter(w => w.privateKey.id == privateKey1.id || w.privateKey.id == privateKey2.id);

      if(matchedPrivateKeys.length == 2){
        return true;
      }
    }
    
    return false;
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
        if (!BlockchainUtils.isPoWValid(current.sha256(), current.target.toString())) {
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

   // Receives candidate blockchains, verifies them, and if a longer and valid alternative is found - uses it to replace
  // our own.
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
      this.save();

      return true;
    }

    return false;
  }

    // Mines for block.
  public mineBlock(transactions: Array<Transaction>): Block {
    // Create a new block which will "point" to the last block.
    const lastBlock = this.getLastBlock();
    const currentTarget = this.getTarget();
    const newBlock = new Block(lastBlock.blockNumber + 1, transactions, BlockchainUtils.now(), 0, lastBlock.sha256(), currentTarget);

    while (true) {
      const pow = newBlock.sha256();
      console.log(`Mining #${newBlock.blockNumber}: nonce: ${newBlock.nonce}, pow: ${pow}`);

      if (BlockchainUtils.isPoWValid(pow, currentTarget.toString())) {
        console.log(`Found valid POW: ${pow}!`);
        break;
      }

      newBlock.nonce++;
    }

    return newBlock;
  }


  // Submits new transaction
  public submitTransaction(senderAddress: Address, recipientAddress: Address, transactionFee: number, value: number, transactionMessage?: string) {
    
    const trxMessage = transactionMessage ? transactionMessage : null

    const tx = new Transaction(senderAddress, recipientAddress, transactionFee, value, trxMessage);

    this.transactionPool.push(tx);

    for (let wallet of this.wallets) {
      if(senderAddress.id == wallet.address.id) {
        wallet.outgoingTransactions.push(tx)
      }
      if(recipientAddress.id == wallet.address.id) {
        wallet.incomingTransactions.push(tx);
      }
    }
  }

  public validAddresses(senderAddress: Address, recipientAddress: Address) {

    const confirmedSenderAddress = this.wallets.filter(w => w.address.id == senderAddress.id);
    const confirmedRecipientAddress = this.wallets.filter(w => w.address.id == recipientAddress.id);

    if (confirmedRecipientAddress.length == 0 || confirmedSenderAddress.length == 0 ){
      return false;
    }

    return true;
  }

  // Creates new block on the blockchain.
  public createBlock(txFeeThreshHold: number): Block {

    const txPool = this.transactionPool.filter(tx => tx.transactionFee >= txFeeThreshHold);

    // Add a "coinbase" transaction granting us the mining reward!
    const coinBaseTxMessage = `block reward is ${Blockchain.MINING_REWARD}$`
    const transactions = [new Transaction(new Address(Blockchain.MINING_SENDER), new Address(this.nodeId),0, Blockchain.MINING_REWARD, coinBaseTxMessage),
      ...txPool];

    // Mine the transactions in a new block.
    const newBlock = this.mineBlock(transactions);

    // Append the new block to the blockchain.
    this.blocks.push(newBlock);

    // Remove the mined transactions.
    this.transactionPool = this.transactionPool.filter(tx => txPool.indexOf(tx) == -1);

    // Adjust pow difficulty
    this.adjustDifficulty();

    // Save the blockchain to the storage.
    this.save();

    return newBlock;
  }

  public getLastBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }


  //adjust the mining difficulty if mining the latest few blocks took significantly longer/shorter time
  //than mining their preceding blocks
  public adjustDifficulty() {
    if (this.blocks.length < Blockchain.DIFFICULTY_SAMPLE_SIZE) {
      return;
    }
    
    const sampleEndIndex = this.blocks.length - 1;
    const sampleStartIndex = sampleEndIndex - Blockchain.DIFFICULTY_SAMPLE_SIZE + 1;
    const center = sampleEndIndex - ((sampleEndIndex - sampleStartIndex) / 2 + 1);

    let latestBlocksTimeDiffs = [];
    let precedingBlocksTimeDiffs = [];
    
    //assigns the difference of creation times between each two consecutive blocks.
    //one arrays represents the most recent half of the sample, and the other one represents the preceding half of the sample (sample=10)
    for (let i = sampleEndIndex; i > center + 1 ; i--) {
      latestBlocksTimeDiffs.push(this.blocks[i].timestamp - this.blocks[i - 1].timestamp);
      const j = sampleEndIndex - i + sampleStartIndex;
      precedingBlocksTimeDiffs.push(this.blocks[j + 1].timestamp - this.blocks[j].timestamp);
    }

    const avgDiffTimeLatestBlocks = this.getAvgDiffTimes(latestBlocksTimeDiffs);
    const avgDiffTimePrecedingBlocks = this.getAvgDiffTimes(precedingBlocksTimeDiffs);

    const difficultyAdjustment = this.getDifficultyAdjustment(avgDiffTimeLatestBlocks, avgDiffTimePrecedingBlocks);
    this.difficulty += difficultyAdjustment;
  }


  private getDifficultyAdjustment(avgLatestBlocks: number, avgPrecedingBlocks: number): number {
  	if (avgLatestBlocks >= avgPrecedingBlocks * Blockchain.DIFFICULTY_FACTOR) {
      if (this.difficulty > Blockchain.MIN_DIFFICULTY) {
        return -1;
      }
    }
    if (avgLatestBlocks <= avgPrecedingBlocks / Blockchain.DIFFICULTY_FACTOR) {
      if (this.difficulty < Blockchain.MAX_DIFFICULTY) {
        return 1;
      }
    }
    return 0;
  }


  private getAvgDiffTimes(timeDiffsArray: Array<number>) {
  	var sum = timeDiffsArray.reduce((a, b) => a + b, 0);
  	return sum / timeDiffsArray.length;
  }


  public getLatestDifficulty(): number {
    const lastBlockTarget = this.getLastBlock().target;
    const exponent = Math.log2(lastBlockTarget);
    const difficulty = 256 - exponent;
    return difficulty;
  }


  public getDifficulty(): number {
    return this.difficulty;
  }


  public getTarget(): number {
    return 2 ** (256 - this.difficulty);
  }

}
