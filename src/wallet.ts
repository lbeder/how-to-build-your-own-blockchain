import {Crypto} from "./crypto";
import {Address, Transaction} from "./transaction";
import {NodeController} from "./node-controller";

export class Wallet {
  private cryptoInstance: any;
  public myAddress: string;
  private myController: NodeController;

  constructor(controller: NodeController) {
    this.cryptoInstance = new Crypto();
    this.myController = controller;
  }

  async init() {
    this.myAddress = await this.cryptoInstance.createKeys();
  }

  async createSignedTransaction(senderAddress: Address, recipientAddress: Address, value: number) {
    const buffer = this.createArrayBufferFromData(senderAddress, recipientAddress, value);
    const signature = await this.cryptoInstance.sign(buffer);
    const transaction = new Transaction(senderAddress, recipientAddress, value, new Uint8Array(signature));
    if (!transaction.verify()) {
      throw new Error('created an invalid transaction');
    }
    this.myController.createTransaction(transaction);
    return transaction;
  }

  private createArrayBufferFromData(senderAddress: Address, recipientAddress: Address, value: number) {
    const leftPad = '0000000000000000';
    const stringValue = (leftPad + Number(value).toString(2)).substr(-16);
    const transactionString = senderAddress + recipientAddress + stringValue;
    return new (<any>window).TextEncoder().encode(transactionString);
  }


}
