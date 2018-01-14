import {Crypto} from "./crypto";
import {deserialize, serialize} from "serializer.ts/Serializer";

export type Address = string;

export class Transaction {
  public senderAddress: Address;
  public recipientAddress: Address;
  public value: number;
  public signature: string;
  public timestamp: string;

  constructor(senderAddress: Address, recipientAddress: Address, value: number, signature: string, timestamp: string) {
    this.senderAddress = senderAddress;
    this.recipientAddress = recipientAddress;
    this.value = value;
    this.signature = signature;
    this.timestamp = timestamp;
  }

  public async verify() {
    try {
      const buffer = Transaction.createArrayBufferFromData(this.senderAddress, this.recipientAddress, this.value, this.timestamp);
      const binarySignature = new Uint8Array((atob(this.signature).split(',')) as any);
      const crypto = new Crypto();
      const isValid = await crypto.verify(this.senderAddress, buffer, binarySignature);
      return isValid;
    } catch (e) {
      debugger;
    }
  }

  public isEqual(transaction: Transaction) {
    return this.signature === transaction.signature;
  }

  public static createArrayBufferFromData(senderAddress: Address, recipientAddress: Address, value: number, timestamp:string) {
    const leftPad = '0000000000000000';
    const stringValue = (leftPad + Number(value).toString(2)).substr(-16);
    const transactionString = senderAddress + recipientAddress + stringValue + timestamp;
    return new (<any>window).TextEncoder().encode(transactionString);
  }
}
