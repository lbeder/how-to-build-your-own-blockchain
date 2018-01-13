import {Crypto} from "./crypto";
import {deserialize, serialize} from "serializer.ts/Serializer";
export type Address = string;

export class Transaction {
  public senderAddress: Address;
  public recipientAddress: Address;
  public value: number;
  public signature: Uint8Array;

  constructor(senderAddress: Address, recipientAddress: Address, value: number, signature: Uint8Array) {
    this.senderAddress = senderAddress;
    this.recipientAddress = recipientAddress;
    this.value = value;
    this.signature = signature;
    this.validate(senderAddress, recipientAddress);
    // TODO: implement signature and verification
  }

  private validate(senderAddress: Address, recipientAddress: Address) {
    // if (senderAddress.length !== 86 || recipientAddress.length !== 86) {
    //   throw new Error("invalid sender or receiver addresses");
    // }
  }

  public async verify() {
    try {
      const buffer = this.createArrayBufferFromData(this.senderAddress, this.recipientAddress, this.value);
      const crypto = new Crypto();
      const isValid = await crypto.verify(this.senderAddress, buffer, this.signature);
      return isValid;
    } catch (e) {
      debugger;
    }
  }

  private createArrayBufferFromData(senderAddress: Address, recipientAddress: Address, value: number) {
    const leftPad = '0000000000000000';
    const stringValue = (leftPad + Number(value).toString(2)).substr(-16);
    const transactionString = senderAddress + recipientAddress + stringValue;
    return new (<any>window).TextEncoder().encode(transactionString);
  }

  public static serialize(transaction: Transaction) {
    const serialized = serialize(transaction);
    serialized.signature = btoa(serialized.signature);
    return serialized;
  }

  public static deserialize(serialized: any) {
    const transaction = deserialize<Transaction>(Transaction, serialized);
    const stringSignature = transaction.signature as any;
    const stringArrayBuffer = (atob(stringSignature).split(',')) as any;
    transaction.signature = new Uint8Array(stringArrayBuffer);
    return transaction
  }
}
