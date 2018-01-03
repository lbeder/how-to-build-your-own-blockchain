import { Address } from "./address";
export class Transaction {
  public senderAddress: Address;
  public recipientAddress: Address;
  public value: number;
  public methodType: string;
  public method: any;
  public args: any;
  public gas: number;

  constructor(
    senderAddress: Address,
    recipientAddress: Address,
    value: number,
    methodType: string = "None", // TODO: refactor default values to constants or nullable
    method: any = "None",
    args: any = "None",
    gas: number = -1
  ) {
    this.senderAddress = senderAddress;
    this.recipientAddress = recipientAddress;
    this.value = value;
    this.methodType = methodType;
    this.method = method;
    this.args = args;
    this.gas = gas;
  }
}

// TODO: Transactions should be refactored to contract transaction and account transaction that inherit from base class.
