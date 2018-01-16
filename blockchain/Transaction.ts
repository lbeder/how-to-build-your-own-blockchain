import { Address } from './Address';
import { sha256 } from 'js-sha256';
import * as _ from 'lodash';
import {Type} from "serializer.ts/Decorators";

export class TransactionInput {
  public txid: string;
  public outputIndex: number;
  public fullPublicKey: string;
  public signature: string;

  constructor(txid: string, outputIndex: number, fullPublicKey: string, signature: string) {
    this.txid = txid;
    this.outputIndex = outputIndex;
    this.fullPublicKey = fullPublicKey;
    this.signature = signature;
  }

  public get hash() {
    return sha256(`${this.txid}|${this.outputIndex}|${this.fullPublicKey}|${this.signature}`);
  }

  public get dataToSign() {
    return sha256(`${this.txid}|${this.outputIndex}`);
  }
}

export class TransactionOutput {
  public address: Address;
  public value: number;

  constructor(address: Address, value: number) {
    this.address = address;
    this.value = value;
  }

  public get hash() {
    return sha256(`${this.address}|${this.value}`);
  }

  public get dataToSign() {
    return this.hash;
  }
}

export class Transaction {
  @Type(() => TransactionInput)
  public inputs: Array<TransactionInput>;
  @Type(() => TransactionOutput)
  public outputs: Array<TransactionOutput>;
  public coinBaseTransactionBlockHeight: number; 

  constructor(inputs: Array<TransactionInput>, outputs: Array<TransactionOutput>, coinBaseTransactionBlockHeight: number) {
    this.inputs = inputs;
    this.outputs = outputs;
    this.coinBaseTransactionBlockHeight = coinBaseTransactionBlockHeight;
  }

  public get hash() {
    const inputsHash = sha256(_.map(this.inputs, 'hash').join('|'));  
    const outputsHash = sha256(_.map(this.outputs, 'hash').join('|'));
    const coinbaseSuffix = this.coinBaseTransactionBlockHeight === undefined ? '' : `|${this.coinBaseTransactionBlockHeight}`;
    return sha256(`${inputsHash}|${outputsHash}${coinbaseSuffix}`);
  }

  public dataToSign(inputIndex: number) {
    const inputDataToSign = this.inputs[inputIndex].dataToSign;
    const outputsDataToSign = sha256(_.map(this.outputs, 'dataToSign').join('|'));
    return sha256(`${inputDataToSign}|${outputsDataToSign}`);
  }
}
