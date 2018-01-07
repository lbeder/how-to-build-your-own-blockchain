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
  public nonce: number;

  constructor(
    senderNodeId: string,
    senderAddress: Address,
    recipientAddress: Address,
    recipientNodeId: string,
    value: number,
    transactionType: string,
    nonce: number,
    senderDigitalSignature?: string
  ) {
    this.senderNodeId = senderNodeId;
    this.senderAddress = senderAddress;
    this.recipientNodeId = recipientNodeId;
    this.recipientAddress = recipientAddress;
    this.value = value;
    this.nonce = nonce;
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
    nonce: number,
    data?: string
  ) {
    super(
      senderNodeId,
      senderAddress,
      recipientAddress,
      recipientNodeId,
      value,
      ACTIONS.CREATE_CONTRACT_ACCOUNT,
      nonce
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
    nonce: number,
    senderDigitalSignature?: string
  ) {
    super(
      senderNodeId,
      senderAddress,
      recipientAddress,
      recipientNodeId,
      value,
      transactionType,
      nonce,
      senderDigitalSignature
    );
  }

  incrementAccountNonce(senderNodeId: string, senderAddress: Address) {}
}
