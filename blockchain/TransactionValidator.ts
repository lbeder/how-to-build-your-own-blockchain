import { Block } from "./Block";
import { Transaction, TransactionInput } from "./Transaction";
import * as _ from 'lodash';
import { sha256 } from 'js-sha256';
const EC = require('elliptic').ec;

export class TransactionValidator {
  private blocks: Array<Block>;
  private pendingTransactions: Array<Transaction>;

  constructor(blocks: Array<Block>, pendingTransactions: Array<Transaction>) {
    this.blocks = blocks;
    this.pendingTransactions = pendingTransactions;
  }

  public validate(transaction: Transaction): boolean {
    if (transaction.inputs.length === 0) return false;

    let inputsSum = 0;
    for (let inputIndex = 0; inputIndex < transaction.inputs.length; inputIndex++) {
      const input = transaction.inputs[inputIndex];

      if (!Number.isInteger(input.outputIndex) || input.outputIndex < 0) return false;

      if (!this.validateTxidIsUnspent(input.txid, input.outputIndex)) return false;
  
      const referencedTransaction = this.findTransaction(input.txid);
      if (!referencedTransaction) return false;
      inputsSum += referencedTransaction.outputs[input.outputIndex].value;
  
      if (sha256(input.fullPublicKey) !== referencedTransaction.outputs[input.outputIndex].address) return false;
  
      const key = new EC('secp256k1').keyFromPublic(input.fullPublicKey, 'hex');
      if (!key.verify(transaction.dataToSign(inputIndex), input.signature)) return false;
    }

    let outputsSum = 0;
    for (let output of transaction.outputs) {
      const value = output.value;
      if (value <= 0 || !Number.isInteger(value)) return false;
      outputsSum += value;
    }
    if(outputsSum > inputsSum) return false;

    return true;
  }

  private validateTxidIsUnspent(txid: string, outputIndex: number) {
    function _validateTransactions(transactions: Transaction[]) {
      for (let transaction of transactions) {
        for (let input of transaction.inputs) {
          if (input.txid === txid && input.outputIndex == outputIndex) {
            return false;
          }
        }
      }
      
      return true;
    }

    if (!_validateTransactions(this.pendingTransactions)) return false;
    for (let block of this.blocks) {
      if (!_validateTransactions(block.transactions)) return false;
    }

    return true;
  }

  private findTransaction(txid: string): Transaction {
    for (let block of this.blocks) {
      const transaction = _.find(block.transactions, (transaction) => transaction.hash === txid);
      if (transaction) return transaction;
    }

    return undefined;
  }
}
