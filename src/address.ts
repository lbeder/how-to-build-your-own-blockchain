export type Address = string;
export const EXTERNAL_ACCOUNT = "external_account";
export const CONTRACT_ACCOUNT = "contract_account";

// According to Whitepaper
/*
    -> The nonce, a counter used to make sure each transaction can only be processed once
    -> The account's current ether balance
    -> The account's contract code, if present
    -> The account's storage (empty by default)
    -> Digital signature

    One Node should be able to have N accounts!
*/

export class Account {
  public address: Address;
  public balance: number;
  public type: string;
  public nonce: number;

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
  constructor(address: Address, balance: number, id: string) {
    super(address, balance);
    this.id = id;
  }
}

export class ContractAccount extends Account {
  public contractId: string;
  constructor(address: Address, balance: number, contractId: string) {
    super(address, balance);
    this.contractId = contractId;
  }
}
