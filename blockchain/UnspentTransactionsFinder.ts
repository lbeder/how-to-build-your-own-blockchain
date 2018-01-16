import { Block } from './Block';
import * as _ from 'lodash';
import { Transaction } from './Transaction';

export class UnspentTransactionsFinder {
  private blocks: Block[];
  private pendingTransactions: Transaction[];

  constructor(blocks: Block[], pendingTransactions: Transaction[]) {
    this.blocks = blocks;
    this.pendingTransactions = pendingTransactions;
  }

  public find(address: string): JSON {
    const outputs = {};

    _.each(this.blocks, (block) => {
      _.each(block.transactions, (transaction) => {
        _.each(transaction.outputs, (output, outputIndex) => {
          if (output.address === address) {
            _.setWith(outputs, `${transaction.hash}.${String(outputIndex)}`, output.value, Object);
          }
        });

        _.each(transaction.inputs, (input) => {
          _.unset(outputs, `${input.txid}.${input.outputIndex}`);
        });
      });
    });

    _.each(this.pendingTransactions, (transaction) => {
      _.each(transaction.inputs, (input) => {
        _.unset(outputs, `${input.txid}.${input.outputIndex}`);
      });
    });

    const unspentTransactionsOutputs:any = [];
    _.each(outputs, (output, txid) => {
      _.each(output, (value, outputIndex) => unspentTransactionsOutputs.push({
        txid,
        outputIndex: Number(outputIndex),
        value
      }));
    });

    return unspentTransactionsOutputs;
  }
}