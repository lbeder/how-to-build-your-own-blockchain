import {Address} from "./Address";

export class Transaction {
  public senderAddress: Address;
  public recipientAddress: Address;
  public transactionMessage: string;
  public transactionFee: number;
  public value: number;

  constructor(senderAddress: Address, recipientAddress: Address, transactionFee:number, value: number, transactionMessage?: string) {
    this.senderAddress = senderAddress;
    this.recipientAddress = recipientAddress;
    this.transactionMessage = transactionMessage ? transactionMessage : `${senderAddress.id} sent ${recipientAddress.id} ${value}$` ;
    this.transactionFee = transactionFee;
    this.value = value;
  }
}