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
  balance: Math.random() * 100,
  id: uuidv4(),
  fromAddress: locations[Math.ceil(Math.random() * 3)],
  changeBalance: function(delta: number, requesterId: number) {
    // axios.get("https://jsonplaceholder.typicode.com").then(function(data) {
    //   console.log(data);
    // });
  },
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
  }
};

// TODO: For security -> Hash all static methods and properties and send data as a transaction to blockchain.
// When loading contract compare hashes for verification to make sure contract was not tampered with.

const serialized = JSON.stringify(TrustfundContract, replacer, 2);

export default serialized;
