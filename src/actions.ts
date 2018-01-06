export const ACTIONS = {
  CREATE_EXTERNAL_ACCOUNT: "create_external_account",
  CREATE_CONTRACT_ACCOUNT: "create_contract_account",
  NODE_REGISTERED: "node_registered",
  TRANSACTION_EXTERNAL_ACCOUNT: "transaction_external_account",
  TRANSACTION_CONTRACT_ACCOUNT: "transaction_contract_account"
};

export interface actions_interface {
  CREATE_EXTERNAL_ACCOUNT: string;
  CREATE_CONTRACT_ACCOUNT: string;
  NODE_REGISTERED: string;
  TRANSACTION_EXTERNAL_ACCOUNT: string;
  TRANSACTION_CONTRACT_ACCOUNT: string;
}
