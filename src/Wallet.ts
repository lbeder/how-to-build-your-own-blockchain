import {Address} from "./Address";
import {Transaction} from "./Transaction";
import {sha256} from 'js-sha256';

export class Wallet {
    public address: Address;
    public publicKey: Address;
    public privateKey: Address;
    public incomingTransactions: Array<Transaction>;
    public outgoingTransactions: Array<Transaction>;
    public type: String;

    constructor(){
        const num = Math.random();
        this.address = new Address(sha256(`${num} address`));
        this.publicKey = new Address(sha256(`${num} publicKey`));
        this.privateKey = new Address(sha256(`${num} privateKey`));
        this.incomingTransactions = [];
        this.outgoingTransactions = [];
        this.type = "regular";
    }

    public setAddress(address: Address) {
        this.address = address;
    }

    public setType(type: String) {
        this.type = type;
    }

    public toString(): String {
        return `${this.address.id}`;
    }
}