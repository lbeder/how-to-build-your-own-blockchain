export type Address = string;

export class Transaction {
  public senderAddress: Address;
  public recipientAddress: Address;
  public value: number;

  constructor(senderAddress: Address, recipientAddress: Address, value: number) {
    this.senderAddress = senderAddress;
    this.recipientAddress = recipientAddress;
    this.value = value;
    // TODO: implement signature and verification
  }
}
