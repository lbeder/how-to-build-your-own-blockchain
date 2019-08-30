import {Address} from "./Address";
import {LNSmartContract} from "./LNSmartContract";

export class Transaction {
  public senderAddress: Address;
  public recipientAddress: Address;
  public value: number;
  public smartContract: LNSmartContract;

  constructor(senderAddress: Address, recipientAddress: Address, value: number){
  	this.senderAddress = senderAddress;
  	this.recipientAddress = recipientAddress;
  	this.value = value;
  }

  public setSmartContract(smartContract: LNSmartContract) {
  	this.smartContract = smartContract;
  }
}