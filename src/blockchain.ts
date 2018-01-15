import * as fs from "fs";
import * as path from "path";
import { Set } from "typescript-collections";
import { serialize, deserialize } from "serializer.ts/Serializer";
import BigNumber from "bignumber.js";
import deepEqual = require("deep-equal");
import {
  Address,
  Account,
  ExternalAccount,
  ContractAccount,
  CONTRACT_ACCOUNT,
  EXTERNAL_ACCOUNT
} from "./accounts";
import { ACTIONS } from "./actions";
import { Block } from "./block";
import {
  Transaction,
  AccountTransaction,
  ContractTransaction
} from "./transaction";
import { Node } from "./node";
import {
  verifyDigitalSignature,
  verifyNonce,
  getDigitalSignature,
  getNodesRequestingTransactionWithBalance,
  validateAdequateFunds,
  updateAccountsWithFinalizedTransactions,
  isCrossOriginRequest,
  getNodeAndAccountIndex,
  isPendingBlockInChain,
  emittableTXMessagesToTXPostReq
} from "./utils";
import { currentId } from "async_hooks";
export class Blockchain {
  // Let's define that our "genesis" block as an empty block, starting from the January 1, 1970 (midnight "UTC").
  public static readonly GENESIS_BLOCK = new Block(0, [], 0, 0, "fiat lux");

  public static readonly DIFFICULTY = 4;
  public static readonly TARGET = 2 ** (256 - Blockchain.DIFFICULTY);

  public static readonly MINING_SENDER = "<COINBASE>";
  public static readonly MINING_REWARD = 50;

  public nodeId: string;
  public nodes: Array<Node>;
  public blocks: Array<Block>;
  public pendingBlock: Block;
  public minedTxAwaitingConsensus: Array<Transaction>;
  public emittedTXMessages: Array<any>;
  public transactionPool: Array<Transaction>;
  private storagePath: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.nodes = [];
    this.transactionPool = [];
    this.pendingBlock = undefined;
    this.minedTxAwaitingConsensus = [];
    this.emittedTXMessages = [];
    this.storagePath = path.resolve(
      __dirname,
      "../",
      `${this.nodeId}.blockchain`
    );

    // Load the blockchain from the storage.
    this.load();
  }

  // Registers new node.
  public register(node: Node): Node {
    this.nodes.push(node);
    return this.nodes[this.nodes.length - 1];
  }

  public updateAccounts(nodes: Array<Node>, currentNodeId: string) {
    this.nodes.forEach(node => {
      node.accounts.forEach(account => {
        // Update Contract Account
        if (account.type === CONTRACT_ACCOUNT) {
          const nodeIdx = nodes.findIndex(node => node.id === currentNodeId);
          if (nodeIdx === -1) {
            throw new Error(
              `blockchain.ts: updateAccounts: could not find contract account nodeId ${currentNodeId} `
            );
          }

          const accountIdx = nodes[nodeIdx].accounts.findIndex(
            accnt => accnt.address === account.address
          );
          if (accountIdx === -1) {
            throw new Error(
              `blockchain.ts: updateAccounts: could not find contract account ${currentNodeId} ${
                account.address
              } `
            );
          }

          account.data = nodes[nodeIdx].accounts[accountIdx].data;
          account.balance = nodes[nodeIdx].accounts[accountIdx].balance;
          account.nonce = nodes[nodeIdx].accounts[accountIdx].nonce;
          return;
        }

        // Update External Account
        const { nodeIdx, accountIdx } = getNodeAndAccountIndex(
          nodes,
          node.id,
          account.address,
          `blockchain.ts: updateAccounts -> could not find indexes...`
        );

        account.balance = nodes[nodeIdx].accounts[accountIdx].balance;
        account.nonce = nodes[nodeIdx].accounts[accountIdx].nonce;
      });
    });
  }

  public createAccount(
    address: Address,
    balance: number,
    account_type: string,
    nodeId: string
  ): any {
    let createdAccount = undefined;
    const nodeIdx = this.nodes.findIndex(node => node.id === nodeId);

    if (account_type === EXTERNAL_ACCOUNT) {
      const external_accnt = new ExternalAccount(
        address,
        balance,
        account_type,
        "randomId"
      );
      this.nodes[nodeIdx].accounts.push(external_accnt);
    } else {
      const contract_accnt = new ContractAccount(
        address,
        balance,
        account_type,
        "randomId"
      );
      this.nodes[nodeIdx].accounts.push(contract_accnt);
    }

    // Submit Account_Creation Transaction
    this.submitTransaction(
      new AccountTransaction(
        nodeId,
        address,
        "NONE",
        "NONE",
        balance,
        ACTIONS.CREATE_EXTERNAL_ACCOUNT,
        undefined
      ),
      false
    ); // can't verify before account is created,
    return this.nodes[nodeIdx].accounts[
      this.nodes[nodeIdx].accounts.length - 1
    ];
  }

  // Saves the blockchain to the disk.
  private save() {
    fs.writeFileSync(
      this.storagePath,
      JSON.stringify(serialize(this.blocks), undefined, 2),
      "utf8"
    );
  }

  // Loads the blockchain from the disk.
  private load() {
    try {
      this.blocks = deserialize<Block[]>(
        Block,
        JSON.parse(fs.readFileSync(this.storagePath, "utf8"))
      );
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
          throw new Error(
            `Invalid block number ${current.blockNumber} for block #${i}!`
          );
        }

        // Verify that the current blocks properly points to the previous block.
        const previous = blocks[i - 1];
        if (current.prevBlock !== previous.sha256()) {
          throw new Error(`Invalid previous block hash for block #${i}!`);
        }

        if (!this.isPoWValid(current.sha256())) {
          throw new Error(
            `Invalid previous block hash's difficutly for block #${i}!`
          );
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
    if (
      bestCandidateIndex !== -1 &&
      (maxLength > this.blocks.length || !Blockchain.verify(this.blocks))
    ) {
      this.blocks = blockchains[bestCandidateIndex];

      this.save();

      return true;
    }

    // Network has reach consensus regarding new block with transactions. Update nodes accordingly.
    if (isPendingBlockInChain(this.pendingBlock, this.blocks)) {
      updateAccountsWithFinalizedTransactions(
        this,
        this.minedTxAwaitingConsensus
      );
      emittableTXMessagesToTXPostReq(this.nodeId, this.emittedTXMessages);
      this.emittedTXMessages = [];
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

  // Mines for block.
  private mineBlock(transactions: Array<Transaction>): Block {
    // Create a new block which will "point" to the last block.
    const lastBlock = this.getLastBlock();
    const newBlock = new Block(
      lastBlock.blockNumber + 1,
      transactions,
      Blockchain.now(),
      0,
      lastBlock.sha256()
    );

    // Indefinitely until we find valid proof of work
    while (true) {
      const pow = newBlock.sha256();
      // console.log(
      //   `Mining #${newBlock.blockNumber}: nonce: ${newBlock.nonce}, pow: ${pow}`
      // );

      if (Blockchain.isPoWValid(pow)) {
        // console.log(`Found valid POW: ${pow}!`);
        break;
      }

      newBlock.nonce++;
    }

    return newBlock;
  }

  private stateTransitionValidation(transaction: Transaction): any {
    const isTransactionSigValid = verifyDigitalSignature(
      this.nodes,
      transaction.senderNodeId,
      transaction.senderAddress,
      transaction.senderDigitalSignature,
      transaction.transactionType
    );

    if (!isTransactionSigValid) {
      throw new Error(
        "Submit Transaction Request: Transaction signature is invalid!"
      );
    }

    const isNonceValid = verifyNonce(
      this.nodes,
      transaction.senderNodeId,
      transaction.senderAddress,
      transaction.nonce
    );
    if (!isNonceValid) {
      return false;
    }

    return true;
  }

  public submitTransaction(transaction: Transaction, shouldValidate = true) {
    // Get sender signature
    if (shouldValidate) {
      const valid = this.stateTransitionValidation(transaction);
      if (!valid) return;
    }

    // State Transition Validation
    this.transactionPool.push(transaction);
  }

  public createBlock(): Block {
    const accountsWithBalances = getNodesRequestingTransactionWithBalance(
      this.nodes,
      this.transactionPool
    );

    // This filters transaction requests that would make the senders balance negative.
    const validatedTxPool = validateAdequateFunds(
      accountsWithBalances,
      this.transactionPool
    );

    const transactions = [
      new Transaction(
        Blockchain.MINING_SENDER,
        "NONE",
        "NONE",
        this.nodeId,
        Blockchain.MINING_REWARD,
        ACTIONS.MINING_REWARD,
        -1
      ),
      ...validatedTxPool
    ];

    // Mine the transactions in a new block.
    const newBlock = this.mineBlock(transactions);

    // These are not finalized as part of the public ledger until there is a consensus
    this.pendingBlock = newBlock;
    // These transactions should update new balances only after they are being written to global blockchain
    this.minedTxAwaitingConsensus.push(...transactions);

    // Append the new block to the blockchain.
    this.blocks.push(newBlock);

    // Empty current tx pool
    this.transactionPool = [];

    // Save the blockchain to the storage.
    this.save();

    return newBlock;
  }

  public getLastBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  public static now(): number {
    return Math.round(new Date().getTime() / 1000);
  }

  public getBlockNumber(): number {
    return this.blocks.length;
  }

  public getContracts(): any {
    const currentNodeIdx = this.nodes.findIndex(
      node => node.id === this.nodeId
    );
    if (currentNodeIdx === -1) {
      throw new Error(
        `blockchain.ts: getContracts -> could not find ${this.nodeId}`
      );
    }

    console.log(`get Contracts ${this.nodeId}`);
    return this.nodes[currentNodeIdx].accounts.filter(
      account => account.type === CONTRACT_ACCOUNT
    );
  }

  public submitContract(
    contractName: string,
    value: number,
    type: string,
    data: string
  ): any {
    const parsedContract = eval(data);
    const currentNodeIdx = this.nodes.findIndex(
      node => node.id === this.nodeId
    );
    this.nodes[currentNodeIdx].accounts.push(
      new ContractAccount(contractName, value, type, data)
    );

    this.submitTransaction(
      new ContractTransaction(
        this.nodeId,
        contractName,
        "NONE",
        "NONE",
        value,
        ACTIONS.CREATE_CONTRACT_ACCOUNT,
        0,
        "NONE",
        "NONE",
        "NONE",
        [],
        "NONE",
        data
      ),
      false
    ); // init nonce
    return parsedContract;
  }
}
