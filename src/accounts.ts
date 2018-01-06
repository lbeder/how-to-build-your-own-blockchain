import * as fs from "fs";
import axios from "axios";
import * as path from "path";
const ursa = require("ursa");
import { Node } from "./node";
import { generateAccountKeys } from "./asymmetric_encryption/generate_rsa_keys";
import { ACTIONS, actions_interface } from "./actions";

export type Address = string;
export type EXTERNAL_ACCOUNT_TYPE = Address;
export type CONTRACT_ACCOUNT_TYPE = Address;
export const CONTRACT_ACCOUNT = "contract_account";
export const EXTERNAL_ACCOUNT = "external_account";

export interface transaction {
  senderAddress: Address;
  recipientAddress: Address;
  value: number;
  action: actions_interface;
}

// TODO: accounts need to be hashed and saved so they can be restored later
export class Account {
  public address: Address;
  public balance: number;
  public type: string;
  public nonce: number;

  constructor(address: Address, balance: number, type: string) {
    this.address = address;
    this.balance = balance;
    this.type = type;
    this.nonce = 0;
  }
}

export class ExternalAccount extends Account {
  public publicKey: any;
  private privateKey: any;
  private storagePath: string;

  constructor(address: Address, balance: number, type: string, id: string) {
    super(address, balance, type);
    this.storagePath = path.resolve(
      __dirname,
      "../",
      "RSAKeys",
      `${address}Keys`
    );

    this.createRSAKeys(address);
  }

  async createRSAKeys(address: Address) {
    const { privpem, pubpem } = await generateAccountKeys(address);
    this.privateKey = ursa.createPrivateKey(
      fs.readFileSync(`${this.storagePath}/privkey.pem`)
    );
    this.publicKey = ursa.createPublicKey(
      fs.readFileSync(`${this.storagePath}/pubkey.pem`)
    );
  }

  // TODO: Encrypting usually work with someone elses key.. This is weird
  encryptActionRequest(action: string): string {
    return this.privateKey.encrypt(action, "utf8", "base64");
  }

  decryptActionRequest(action: string): string {
    return;
  }

  createDigitalSignature(action: string): string {
    console.log(
      `Sig Creation: Account ${
        this.address
      } is being called. Signature for action ${action} ${ursa.isPrivateKey(
        this.privateKey
      )}`
    );
    return this.privateKey.hashAndSign(
      "sha256",
      Buffer.from(action, "utf8"),
      "utf8",
      "base64"
    );
  }

  verifyDigitalSignature(action: string, signature: string) {
    console.log(
      `Sig Verification: Account ${
        this.address
      } is being called. Signature for action ${action}`
    );
    return this.publicKey.hashAndVerify(
      "sha256",
      Buffer.from(action, "utf8"),
      signature,
      "base64"
    );
  }

  // TODO: Send msg, ie. transfer funds or trigger contract execution
  sendMessage(requested_transaction: transaction) {}
}

export class ContractAccount extends Account {
  public data: any;
  public updatedData: any;
  constructor(address: Address, balance: number, type: string, data: any) {
    super(address, balance, type);
    this.data = data;
  }
}
