import * as express from "express";
import axios from "axios";
import { serialize, deserialize } from "serializer.ts/Serializer";
import { Blockchain } from "./blockchain";
import { Node } from "./node";
import {
  Transaction,
  ContractTransaction,
  AccountTransaction
} from "./transaction";
import { Address, ContractAccount, CONTRACT_ACCOUNT } from "./accounts";
import { ACTIONS } from "./actions";
import { Block } from "./block";

export const getNodeAndAccountIndex = (
  nodes: Array<Node>,
  nodeId: string,
  nodeAddress: Address,
  errMsg: string,
  type?: string
) => {
  if (type === ACTIONS.TRANSACTION_CONTRACT_ACCOUNT) {
    return getNodeAndContractIndex(nodes, nodeId, nodeAddress, errMsg);
  }

  const nodeIdx = nodes.findIndex(node => node.id === nodeId);
  if (nodeIdx === -1) {
    throw new Error(`${errMsg} -> could not find nodeIdx of ${nodeId}`);
  }

  const accountIdx = nodes[nodeIdx].accounts.findIndex(
    accnt => accnt.address === nodeAddress
  );
  if (accountIdx === -1) {
    throw new Error(
      `${errMsg} -> could not find accountIdx of ${nodeAddress} and nodeIdx ${nodeId}`
    );
  }

  return {
    nodeIdx,
    accountIdx
  };
};

export const getNodeAndContractIndex = (
  nodes: Array<Node>,
  nodeId: string,
  contractAddress: Address,
  errMsg: string
) => {
  const nodeIdx = nodes.findIndex(node => node.id === nodeId);
  if (nodeIdx === -1) {
    throw new Error(
      `utils.ts: getNodeAndContractIndex: ${errMsg} -> could not find accountIdx of ${nodeId}`
    );
  }

  // Find contract by address
  const accountIdx = nodes[nodeIdx].accounts.findIndex(
    account =>
      account.address === contractAddress && account.type === CONTRACT_ACCOUNT
  );
  if (accountIdx === -1) {
    throw new Error(
      `utils.ts: getNodeAndContractIndex: ${errMsg} -> could not find contractIndex of ${contractAddress}`
    );
  }

  return {
    nodeIdx,
    accountIdx
  };
};

export const postAccountUpdates = (blockchain: Blockchain, nodeId: string) => {
  const requests = blockchain.nodes
    .filter(node => node.id !== nodeId)
    .map(node =>
      axios.post(`${node.url}updateAccountData`, {
        sourceOfTruthNode: nodeId,
        nodes: blockchain.nodes
      })
    );

  if (requests.length === 0) {
    return {
      success: true,
      msg: "Utils: Post account updates, No nodes to update"
    };
  }

  axios
    .all(requests)
    .then(
      axios.spread((...responses) => {
        responses.map(res => console.log(res.data));
      })
    )
    .catch(err => {
      throw new Error(`Utils.ts: postAccountUpdates failed ${err}`);
    });

  return {
    success: true,
    msg: "Utils.ts: Post accounts updates, successfully updated all nodes"
  };
};

export const getConsensus = (
  req: express.Request,
  res: express.Response,
  blockchain: Blockchain,
  nodeId: string
) => {
  let propogateRes;
  const requests = blockchain.nodes
    .filter(node => node.id !== nodeId)
    .map(node => axios.get(`${node.url}blocks`));

  if (requests.length === 0) {
    res.status(404);
    res.json("There are no nodes to sync with!");
    return;
  }

  axios
    .all(requests)
    .then(
      axios.spread(async (...blockchains) => {
        if (
          blockchain.consensus(
            blockchains.map(res => {
              return deserialize<Block[]>(Block, res.data);
            })
          )
        ) {
          // console.log(`Node ${nodeId} has reached a consensus on a new state.`);
        } else {
          console.log(`Node ${nodeId} has the longest chain.`);
          // Propogate new account data to network
          propogateRes = postAccountUpdates(blockchain, nodeId);
        }
      })
    )
    .catch(err => {
      console.log(err);
      res.status(500);
      res.json(err);
      return;
    });
};

export const getDigitalSignature = (
  nodes: Array<Node>,
  nodeId: string,
  senderAddress: string,
  action: string
): any => {
  const { nodeIdx, accountIdx } = getNodeAndAccountIndex(
    nodes,
    nodeId,
    senderAddress,
    "Utils: getDigitalSignature "
  );

  return nodes[nodeIdx].accounts[accountIdx].createDigitalSignature(action);
};

export const verifyDigitalSignature = (
  nodes: Array<Node>,
  nodeId: string,
  senderAddress: string,
  signature: string,
  action: string
): boolean => {
  const { nodeIdx, accountIdx } = getNodeAndAccountIndex(
    nodes,
    nodeId,
    senderAddress,
    "Utils: verifyDigitalSignature "
  );

  return !nodes[nodeIdx].accounts[accountIdx].verifyDigitalSignature(
    action,
    signature
  )
    ? false
    : true;
};

export const verifyNonce = (
  nodes: Array<Node>,
  nodeId: string,
  nodeAddress: Address,
  txNonce: number
) => {
  const { nodeIdx, accountIdx } = getNodeAndAccountIndex(
    nodes,
    nodeId,
    nodeAddress,
    "Utils: verifyNonce "
  );

  return txNonce === nodes[nodeIdx].accounts[accountIdx].nonce ? true : false;
};

export const getBalance = (
  nodes: Array<Node>,
  nodeId: string,
  nodeAddress: Address
) => {
  const { nodeIdx, accountIdx } = getNodeAndAccountIndex(
    nodes,
    nodeId,
    nodeAddress,
    "Utils: getBalance "
  );
  return nodes[nodeIdx].accounts[accountIdx].balance;
};

export const getNodesRequestingTransactionWithBalance = (
  nodes: Array<Node>,
  transactionPool: Array<Transaction>
) => {
  const accountBalances: { [k: string]: any } = {};
  // Filter transactions to only those moving funds
  const filteredPool = transactionPool.filter(tx => {
    return (
      tx.transactionType === ACTIONS.TRANSACTION_EXTERNAL_ACCOUNT ||
      tx.transactionType === ACTIONS.TRANSACTION_CONTRACT_ACCOUNT
    );
  });

  filteredPool.forEach(tx => {
    const { senderNodeId, senderAddress, transactionType } = tx;
    const { nodeIdx, accountIdx } = getNodeAndAccountIndex(
      nodes,
      senderNodeId,
      senderAddress,
      "Utils: getNodesRequestingTransactionWithBalance ",
      transactionType
    );
    accountBalances[senderAddress] =
      nodes[nodeIdx].accounts[accountIdx].balance;
    return;
  });

  return accountBalances;
};

export const isCrossOriginRequest = (
  senderNodeId: string,
  currentNodeId: string
) => {
  return senderNodeId !== currentNodeId;
};

export const validateAdequateFunds = (
  accountsWithBalance: any,
  txpool: Array<Transaction>
) => {
  if (
    Object.keys(accountsWithBalance).length === 0 &&
    accountsWithBalance.constructor === Object
  ) {
    return txpool;
  }

  return txpool.filter(tx => {
    if (
      !(tx.transactionType === ACTIONS.TRANSACTION_CONTRACT_ACCOUNT) &&
      !(tx.transactionType === ACTIONS.TRANSACTION_EXTERNAL_ACCOUNT)
    ) {
      return true; // This does not move funds, no validation needed
    }

    const newBalance = accountsWithBalance[tx.senderAddress] - tx.value;
    if (newBalance < 0) {
      console.log(
        `${
          tx.senderAddress
        } did not have sufficient funds for tx. Removed from tx pool as invalid...`
      );
      return false;
    }

    accountsWithBalance[tx.senderAddress] -= tx.value;
    return true;
  });
};

export const updateAccountsWithFinalizedTransactions = (
  blockchain: Blockchain,
  txpool: Array<any>
) => {
  txpool.forEach(tx => {
    if (
      !(tx.transactionType === ACTIONS.TRANSACTION_CONTRACT_ACCOUNT) &&
      !(tx.transactionType === ACTIONS.TRANSACTION_EXTERNAL_ACCOUNT)
    ) {
      return; // This does not move funds, no validation needed
    }

    const { nodeIdx, accountIdx } = getNodeAndAccountIndex(
      blockchain.nodes,
      tx.senderNodeId,
      tx.senderAddress,
      "Utils: updateAccountsWithFinalizedTransactions senderIndexes "
    );

    if (tx.transactionType === ACTIONS.TRANSACTION_EXTERNAL_ACCOUNT) {
      // Update sender account information
      blockchain.nodes[nodeIdx].accounts[accountIdx].balance -= tx.value;

      // Update account nonce
      blockchain.nodes[nodeIdx].accounts[accountIdx].nonce++;

      // Update receiver data
      const receiverIndexes = getNodeAndAccountIndex(
        blockchain.nodes,
        tx.recipientNodeId,
        tx.recipientAddress,
        "Utils: updateAcocuntsWithFinalizedTransaction recipientIndex "
      );
      blockchain.nodes[receiverIndexes.nodeIdx].accounts[
        receiverIndexes.accountIdx
      ].balance +=
        tx.value;
    } else {
      const parsedContract = ContractAccount.parseContractData(
        blockchain,
        nodeIdx,
        accountIdx,
        blockchain.nodes[nodeIdx].accounts[accountIdx].nonce
      );

      if (typeof parsedContract[tx.method] !== "function") {
        throw new Error(
          `server.ts: mutateContract -> method ${
            tx.method
          } does not exist on contract...`
        );
      }

      const emittedTx =
        tx.args.length === 0
          ? parsedContract[tx.method]()
          : parsedContract[tx.method](...tx.args);

      if (emittedTx) {
        blockchain.emittedTXMessages.push(emittedTx);
      }

      ContractAccount.updateContractState(
        blockchain,
        nodeIdx,
        accountIdx,
        parsedContract
      );
    }
  });
  blockchain.minedTxAwaitingConsensus = [];
};

export const isPendingBlockInChain = (
  pendingBlock: Block,
  blocks: Array<Block>
): boolean => {
  if (!pendingBlock) return false;
  return (
    blocks.findIndex(
      block => JSON.stringify(block) === JSON.stringify(pendingBlock)
    ) !== -1
  );
};

const mapNodeIdToPort: any = {
  A: "3000",
  B: "3001",
  C: "3002"
};

export const emittableTXMessagesToTXPostReq = async (
  nodeId: string,
  emittedTXReqArr: Array<any>
) => {
  const requests = emittedTXReqArr.map(tx =>
    axios.post(`http://localhost:${mapNodeIdToPort[nodeId]}/transactions`, tx)
  );

  if (requests.length === 0) {
    return;
  }

  try {
    const res = await axios.all(requests);
  } catch (e) {
    console.log(`utils.ts: emittableTxMessagesToTXPostReq ${e}`);
  }

  return;
};

export const getPublicKey = (
  blockchain: Blockchain,
  nodeId: string,
  accountAddress: Address
) => {
  const { nodeIdx, accountIdx } = getNodeAndAccountIndex(
    blockchain.nodes,
    nodeId,
    accountAddress,
    "Utils: getPublicKeys senderIndexes "
  );

  return blockchain.nodes[nodeIdx].accounts[accountIdx].getPublicKey();
};

export const encryptPasswords = (blockchain: Blockchain, password: string) => {
  const passwordDictionary: any = {};
  blockchain.nodes.forEach(node => {
    node.accounts.forEach(account => {
      if (account.type === CONTRACT_ACCOUNT) {
        return;
      }
      passwordDictionary[account.address] = {
        nodeId: node.id,
        address: account.address,
        encryptedPassword: account.encryptActionRequest(password)
      };
    });
  });
  return passwordDictionary;
};
