import { Address } from "./address";
export class Transaction {
  public senderAddress: Address;
  public recipientAddress: Address;
  public balance: number;
  public type: string;
  public method: any;
  public args: any;
  public gas: number;
  public data: string;

  constructor(
    senderAddress: Address,
    recipientAddress: Address,
    balance: number,
    type: string = "None", // Initializing contract, mutating value, transfer of funds etc...
    method: any = "None",
    args: any = "None",
    gas: number = -1,
    data: string = "None"
  ) {
    this.senderAddress = senderAddress;
    this.recipientAddress = recipientAddress;
    this.balance = balance;
    this.type = type;
    this.method = method;
    this.args = args;
    this.gas = gas;
    this.data = data;
  }
}

// TODO: Transactions should be refactored to contract transaction and account transaction that inherit from base class.
