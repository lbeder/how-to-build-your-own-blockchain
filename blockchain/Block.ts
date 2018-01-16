import { Transaction } from './Transaction';
import { sha256 } from "js-sha256";
import { serialize, deserialize } from "serializer.ts/Serializer";
import {Type} from "serializer.ts/Decorators";

export class Block {
  public blockNumber: number;

  @Type(() => Transaction)
  public transactions: Transaction[];
  
  public timestamp: number;
  public nonce: number;
  public prevBlock: string;

  constructor(blockNumber: number, transactions: Transaction[], timestamp: number, nonce: number,
    prevBlock: string) {
    this.blockNumber = blockNumber;
    this.transactions = transactions;
    this.timestamp = timestamp;
    this.nonce = nonce;
    this.prevBlock = prevBlock;
  }

  // Calculates the SHA256 of the entire block, including its transactions.
  public sha256(): string {
    return sha256(JSON.stringify(serialize<Block>(this)));
  }
}