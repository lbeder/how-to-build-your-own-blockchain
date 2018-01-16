import {Transaction} from "./Transaction";
import { sha256 } from "js-sha256";
import { serialize } from "serializer.ts/Serializer";


export class Block {
  public blockNumber: number;
  public transactions: Array<Transaction>;
  public timestamp: number;
  public nonce: number;
  public prevBlock: string;
  public target: number;

  constructor(blockNUmber: number, transactions: Array<Transaction>, timestamp: number, nonce: number, prevblock: string, target: number){
  	this.blockNumber = blockNUmber;
  	this.transactions = transactions;
  	this.timestamp = timestamp;
  	this.nonce = nonce;
  	this.prevBlock = prevblock;
    this.target = target;
  }


  // Calculates the SHA256 of the entire block, including its transactions.
  public sha256(): string {
    return sha256(JSON.stringify(serialize<Block>(this)));
  }
}