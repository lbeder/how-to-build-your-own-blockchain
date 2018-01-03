export type Address = string;
export const EXTERNAL_ACCOUNT = "external_account";
export const CONTRACT_ACCOUNT = "contract_account";

export class Account {
  public address: Address;
  public balance: number;
  public type: string;
  public nonce: number;
  public publicKey: string;
  private privateKey: string;

  constructor(
    address: Address,
    balance: number,
    type = EXTERNAL_ACCOUNT,
    contractId = "None"
  ) {
    this.address = address;
    this.balance = balance;
    this.type = type;
    this.nonce = 0;
  }
}

export class ExternalAccount extends Account {
  public id: string;
  constructor(address: Address, balance: number, type: string, id: string) {
    super(address, balance, type);
    this.id = id;
  }
}

export class ContractAccount extends Account {
  public contractId: string;
  constructor(
    address: Address,
    balance: number,
    type: string,
    contractId: string
  ) {
    super(address, balance, type);
    this.contractId = contractId;
  }
}
