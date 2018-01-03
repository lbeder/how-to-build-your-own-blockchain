import { serialize } from "serializer.ts/Serializer";
import * as uuidv4 from "uuid/v4";
import axios from "axios";

import { Node } from "../node";

const locations = ["Kuwait", "Chelsea", "Tribeca", "Health Nexus"];

const replacer = (key: any, value: any) => {
  if (typeof value === "function") {
    return value.toString();
  }
  return value;
};
const experiment =
  '({ balance: 1000, incrementValue: function() { this.balance++; }, id: 1, fromAddress: "Alice", call: function() { return {getBalance: this.balance, getFromAddress: this.fromAddress}}, send: function() { return { incrementValue: this.incrementValue} }, abi: function() { return {sendables: this.incrementValue.toString()} } })';
// TODO: For security -> Hash all static methods and properties and send data as a transaction to blockchain.
// When loading contract compare hashes for verification to make sure contract was not tampered with.

export default experiment;
