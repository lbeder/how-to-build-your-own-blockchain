import { Persistency } from './persistency';
import { sha256 } from "js-sha256";
import BigNumber from "bignumber.js";
import { serialize, deserialize } from 'serializer.ts/Serializer';
import * as _ from 'lodash';

import * as fs from "fs";
import * as path from "path";
import deepEqual = require("deep-equal");

import * as uuidv4 from "uuid/v4";
import * as express from "express";
import * as bodyParser from "body-parser";
import { URL } from "url";
import axios from "axios";

import { Set } from "typescript-collections";
import * as parseArgs from "minimist";
import { Block } from './block';
import { Transaction, TransactionInput, TransactionOutput } from './Transaction';
import { BlockchainVerifier } from './BlockchainVerifier';
import { PowVerifier } from './PowVerifier';
import { Node } from './Node';
import { Address } from './Address';
import { TransactionValidator } from './TransactionValidator';
import { UnspentTransactionsFinder } from './UnspentTransactionsFinder';
const EC = require('elliptic').ec;

export class Blockchain {
  public static readonly MINING_REWARD = 50 * 1000;

  public nodeId: string;
  public nodes: Set<Node>;
  public blocks: Array<Block>;
  public transactionPool: Array<Transaction>;
  private persistency: Persistency;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.nodes = new Set<Node>();
    this.transactionPool = [];

    this.persistency = new Persistency(path.resolve(__dirname, "../", `${this.nodeId}.blockchain`));
    this.blocks = this.persistency.blocks;
  }

  // Registers new node.
  public register(node: Node): boolean {
    return this.nodes.add(node);
  }

  // Verifies the blockchain.
  private verify() {
    // The blockchain can't be empty. It should always contain at least the genesis block.
    if (!BlockchainVerifier.verify(this.blocks)) {
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
      if (BlockchainVerifier.verify(candidate)) {
        maxLength = candidate.length;
        bestCandidateIndex = i;
      }
    }

    // Compare the candidate and consider to use it.
    if (bestCandidateIndex !== -1 && (maxLength > this.blocks.length || !BlockchainVerifier.verify(this.blocks))) {
      this.blocks = blockchains[bestCandidateIndex];
      this.persistency.saveBlocks(this.blocks);

      return true;
    }

    return false;
  }

  // Mines for block.
  private mineBlock(transactions: Array<Transaction>): Block {
    // Create a new block which will "point" to the last block.
    const lastBlock = this.getLastBlock();
    const newBlock = new Block(lastBlock.blockNumber + 1, transactions, Blockchain.now(), 0, lastBlock.sha256());

    while (true) {
      const pow = newBlock.sha256();
      console.log(`Mining #${newBlock.blockNumber}: nonce: ${newBlock.nonce}, pow: ${pow}`);

      if (PowVerifier​​.isPoWValid(pow)) {
        console.log(`Found valid POW: ${pow}!`);
        break;
      }

      newBlock.nonce++;
    }

    return newBlock;
  }

  // Submits new transaction
  public submitTransaction(transaction: Transaction): boolean {
    const transactionValidator = new TransactionValidator(this.blocks, this.transactionPool);
    if (!transactionValidator.validate(transaction)) return false;

    this.transactionPool.push(transaction);
    return true;
  }

  // Creates new block on the blockchain.
  public createBlock(): Block {
    // Add a "coinbase" transaction granting us the mining reward!
    const privateKey = new EC('secp256k1').keyFromPrivate(this.persistency.privateKey);
    const publicKeyHash = sha256(privateKey.getPublic('hex'));
    const rewardTransaction = new Transaction([], [new TransactionOutput(publicKeyHash, Blockchain.MINING_REWARD)], this.blocks.length);
    const transactions = [rewardTransaction, ...this.transactionPool];

    // Mine the transactions in a new block.
    const newBlock = this.mineBlock(transactions);

    // Append the new block to the blockchain.
    this.blocks.push(newBlock);

    // Remove the mined transactions.
    this.transactionPool = [];

    // Save the blockchain to the storage.
    this.persistency.saveBlocks(this.blocks);

    return newBlock;
  }

  public getLastBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  public static now(): number {
    return Math.round(new Date().getTime() / 1000);
  }

  public findUnspentTransactions(address: string): JSON {
    return new UnspentTransactionsFinder(this.blocks, this.transactionPool).find(address);
  }
}