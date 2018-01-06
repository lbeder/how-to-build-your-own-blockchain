import { generateAccountKeys } from "./asymmetric_encryption/generate_rsa_keys";
export type Address = string;
export const EXTERNAL_ACCOUNT = "external_account";
export const CONTRACT_ACCOUNT = "contract_account";

// TODO: accounts need to be hashed and saved so they can be restored later
export class Account {
  public address: Address;
  public balance: number;
  public type: string;
  public nonce: number;
  public publicKey: string;
  private privateKey: string;

  constructor(address: Address, balance: number, type: string) {
    this.address = address;
    this.balance = balance;
    this.type = type;
    this.nonce = 0;

    this.createRSAKeys(address);
  }

  async createRSAKeys(address: Address) {
    const keys = await generateAccountKeys(address);
  }
}

export class ExternalAccount extends Account {
  constructor(address: Address, balance: number, type: string, id: string) {
    super(address, balance, type);
  }
}

export class ContractAccount extends Account {
  public data: any;
  public updatedData: any;
  constructor(address: Address, balance: number, type: string, data: any) {
    super(address, balance, type);
    this.data = data;
  }
}
