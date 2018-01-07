import { Address } from "./accounts";
import { ACTIONS } from "./actions";

export class Transaction {
  public senderNodeId: string;
  public senderAddress: Address;
  public recipientNodeId: string;
  public recipientAddress: Address;
  public value: number;
  public transactionType: string;
  public senderDigitalSignature: string;

  constructor(
    senderNodeId: string,
    senderAddress: Address,
    recipientAddress: Address,
    recipientNodeId: string,
    value: number,
    transactionType: string,
    senderDigitalSignature?: string
  ) {
    this.senderNodeId = senderNodeId;
    this.senderAddress = senderAddress;
    this.recipientNodeId = recipientNodeId;
    this.recipientAddress = recipientAddress;
    this.value = value;
    this.transactionType = transactionType;
    this.senderDigitalSignature = senderDigitalSignature;
  }
}

// TODO: add support for callable / sendable methods with args...
export class ContractTransaction extends Transaction {
  public data: string;
  constructor(
    senderNodeId: string,
    senderAddress: Address,
    recipientAddress: Address,
    recipientNodeId: string,
    value: number,
    transactionType: string,
    data?: string
  ) {
    super(
      senderAddress,
      senderNodeId,
      recipientAddress,
      recipientNodeId,
      value,
      ACTIONS.CREATE_CONTRACT_ACCOUNT
    );
    this.data = data;
  }
}

export class AccountTransaction extends Transaction {
  constructor(
    senderNodeId: string,
    senderAddress: Address,
    recipientAddress: Address,
    recipientNodeId: string,
    value: number,
    transactionType: string,
    senderDigitalSignature?: string
  ) {
    super(
      senderNodeId,
      senderAddress,
      recipientAddress,
      recipientNodeId,
      value,
      transactionType,
      senderDigitalSignature
    );
  }
}
