import { serialize } from "serializer.ts/Serializer";
import * as uuidv4 from "uuid/v4";
import axios from "axios";

// TODO: Omer Goldberg
const locations = ["NYC", "TLV", "Narnia", "Cryptoville"];

const replacer = (key: any, value: any) => {
  if (typeof value === "function") {
    return value.toString();
  }
  return value;
};

const TrustfundContract = {
  balance: 400,
  id: 2,
  fromAddress: "Stacy",
  call: function() {
    return {
      getBalance: this.balance,
      getFromAddress: this.fromAddress
    };
  },
  send: function() {
    return {
      changeBalance: this.changeBalance
    };
  },
  abi: function() {
    return {
      callables: this.call(),
      sendables: this.send()
    };
  },
  moveFunds: function() {
    return {
      senderNodeId: "B",
      senderAddress: "Bob",
      recipientNodeId: "A",
      recipientAddress: "Alice",
      value: 20,
      action: "TRANSACTION_EXTERNAL_ACCOUNT"
    };
  }
};

// TODO: For security -> Hash all static methods and properties and send data as a transaction to blockchain.
// When loading contract compare hashes for verification to make sure contract was not tampered with.

const serialized = JSON.stringify(TrustfundContract, replacer, 2);

export default serialized;

const experiment2 = eval(
  '({balance: 400, expirationDate: new Date("October 13, 2016 11:13:00"),id: 2, fromAddress: "Stacy", call: function() { return { getBalance: this.balance, getFromAddress: this.fromAddress }; }, send: function() { return { changeBalance: this.changeBalance }; }, abi: function() { return { callables: this.call(), sendables: this.send() }; }, moveFunds: function() { var currentDate = new Date(); if (currentDate > this.expirationDate) { console.log(currentDate, this.expirationDate, "moving funds....");} return { senderNodeId: "B", senderAddress: "Bob", recipientNodeId: "A", recipientAddress: "Alice", value: 20, action: "TRANSACTION_EXTERNAL_ACCOUNT" };} })'
);
