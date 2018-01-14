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
    const timestamp = Date.now().toString();
    const buffer = Transaction.createArrayBufferFromData(senderAddress, recipientAddress, value, timestamp);
    const signature = await this.cryptoInstance.sign(buffer);
    const stringSignature = btoa(new Uint8Array(signature) as any);
    const transaction = new Transaction(senderAddress, recipientAddress, value, stringSignature, timestamp);
    if (!transaction.verify()) {
      throw new Error('created an invalid transaction');
    }
    this.myController.createTransaction(transaction);
    return transaction;
  }
}
