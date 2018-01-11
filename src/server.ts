import { sha256 } from "js-sha256";
import { serialize, deserialize } from "serializer.ts/Serializer";
import { isArray } from "lodash";
import BigNumber from "bignumber.js";
import * as fs from "fs";
import * as path from "path";
import deepEqual = require("deep-equal");
import * as uuidv4 from "uuid/v4";
import * as express from "express";
import * as bodyParser from "body-parser";
import { URL } from "url";
import axios from "axios";
import { Set } from "typescript-collections";
import * as parseArgs from "minimist";
import { Address, ContractAccount, CONTRACT_ACCOUNT } from "./accounts";
import { ACTIONS } from "./actions";
import {
  Transaction,
  ContractTransaction,
  AccountTransaction
} from "./transaction";
import { Block } from "./block";
import { Node } from "./node";
import { Blockchain } from "./blockchain";
import {
  getNodeAndAccountIndex,
  getNodeAndContractIndex,
  getConsensus,
  getDigitalSignature,
  isCrossOriginRequest
} from "./utils";

// Web server:
const ARGS = parseArgs(process.argv.slice(2));
const PORT = ARGS.port || 3000;
const app = express();
const nodeId = ARGS.id || uuidv4();
const blockchain = new Blockchain(nodeId);

// Set up bodyParser:
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500);
  }
);

// Show all the blocks.
app.get("/blocks", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.blocks));
});

// Show specific block.
app.get("/blocks/:id", (req: express.Request, res: express.Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.json("Invalid parameter!");
    res.status(500);
    return;
  }

  if (id >= blockchain.blocks.length) {
    res.json(`Block #${id} wasn't found!`);
    res.status(404);
    return;
  }

  res.json(serialize(blockchain.blocks[id]));
});

app.post("/blocks/mine", (req: express.Request, res: express.Response) => {
  // Mine the new block.
  const newBlock = blockchain.createBlock();

  res.json(`Mined new block #${newBlock.blockNumber}`);
});

// TODO: Omer
app.post("/createAccount", (req: express.Request, res: express.Response) => {
  const { address, balance, account_type, nodeId } = req.body;
  const createdNode = blockchain.createAccount(
    address,
    balance,
    account_type,
    nodeId
  );

  // Verify creation of Node
  if (!createdNode) {
    res.json(
      `CreateAccount Failed to create node with address ${address}, balance ${balance}, type ${account_type} `
    );
    res.status(404);
    return;
  }

  // Success msg
  res.json(
    `Creation of account ${address} of type ${account_type} with balance ${balance}`
  );
});

// TODO: Omer
app.post(
  "/updateAccountData",
  (req: express.Request, res: express.Response) => {
    const { sourceOfTruthNode, nodes } = req.body;
    blockchain.updateAccounts(nodes, sourceOfTruthNode);
    res.json(
      `Updating accounts in ${nodeId} data with accounts in node ${sourceOfTruthNode}`
    );
  }
);

// TODO: Omer
app.post(
  "/propogateAccountCreation",
  (req: express.Request, res: express.Response) => {
    const { address, balance, account_type, nodeId } = req.body;
    const createdNode = blockchain.createAccount(
      address,
      balance,
      account_type,
      nodeId
    );

    // Verify creation of node
    if (!createdNode) {
      res.json(
        `PropogateAccountCreation failed to create node with address ${address}, balance ${balance}, type ${account_type} `
      );
      res.status(404);
      return;
    }

    // Propogate account to rest of Nodes on network
    const requests = blockchain.nodes
      .filter(node => node.id !== nodeId)
      .map(node =>
        axios.post(`${node.url}createAccount`, {
          address: address,
          balance: balance,
          nodeId: nodeId,
          account_type: account_type
        })
      );

    axios
      .all(requests)
      .then(axios.spread((...responses) => responses.map(res => res.data)))
      .catch(err => {
        console.log(err);
        res.status(500);
        res.json(err);
        return;
      });

    res.status(500);
    res.json(
      `Propogated creation of account ${address} of type ${account_type} with balance ${balance}`
    );
  }
);

// TODO: Omer
app.get("/contracts", (req: express.Request, res: express.Response) => {
  const contracts = blockchain.getContracts();
  res.json(contracts);
});

// TODO: Omer
app.post("/deployContract", (req: express.Request, res: express.Response) => {
  const { contractName, contract, value, type } = req.body;
  blockchain.submitContract(contractName, value, type, contract);
  res.json(JSON.stringify(`${nodeId} deployed contracts!`));
});

// TODO: Omer
app.post(
  "/propogateContract",
  (req: express.Request, res: express.Response) => {
    const { address, value, type, data } = req.body;
    blockchain.submitContract(address, value, type, data);

    const requests = blockchain.nodes
      .filter(node => node.id !== nodeId)
      .map(node =>
        axios.post(`${node.url}deployContract`, {
          contractName: address,
          contract: data,
          value: value,
          type: type
        })
      );

    if (requests.length === 0) {
      res.json("There are no nodes to sync with!");
      res.status(404);

      return;
    }
    axios
      .all(requests)
      .then(
        axios.spread((...responses) =>
          responses.map(res => console.log(res.data))
        )
      )
      .catch(err => {
        console.log(err);
        res.status(500);
        res.json(err);
        return;
      });

    res.status(500);

    res.json(data);
  }
);

app.put(
  "/mutateContract/:address",
  (req: express.Request, res: express.Response) => {
    const { address } = req.params;
    const { method } = req.body;
    const { nodeIdx, accountIdx } = getNodeAndContractIndex(
      blockchain.nodes,
      nodeId,
      address,
      "Could not find contract node or address"
    );

    // Create Transaction
    const { initiaterNode, initiaterAddress, value } = req.body;

    // TODO: address should specify who inited the mutation
    // Add transaction to blockchain
    const transaction = blockchain.submitTransaction(
      new ContractTransaction(
        nodeId,
        address,
        "NONE",
        "NONE",
        100,
        ACTIONS.TRANSACTION_CONTRACT_ACCOUNT,
        blockchain.nodes[nodeIdx].accounts[accountIdx].nonce,
        initiaterNode,
        initiaterAddress,
        method
      ),
      false
    );

    res.json(blockchain.nodes[nodeIdx].accounts[accountIdx]);
  }
);

// Show all transactions in the transaction pool.
app.get("/transactions", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.transactionPool));
});

app.post("/transactions", (req: express.Request, res: express.Response) => {
  const {
    senderNodeId,
    senderAddress,
    recipientAddress,
    recipientNodeId,
    action,
    method,
    data
  } = req.body;
  if (isCrossOriginRequest(senderNodeId, nodeId)) {
    throw new Error(
      `Cross Origin Requests are prohibited ${senderNodeId} ${nodeId}`
    );
  }
  const value = Number(req.body.value);

  if (
    !senderNodeId ||
    !senderAddress ||
    !recipientAddress ||
    !recipientNodeId ||
    !value ||
    !action
  ) {
    res.json("Invalid parameters!");
    res.status(500);
    return;
  }

  const digitalSignature = getDigitalSignature(
    blockchain.nodes,
    senderNodeId,
    senderAddress,
    action
  );

  const { nodeIdx, accountIdx } = getNodeAndAccountIndex(
    blockchain.nodes,
    senderNodeId,
    senderAddress,
    `POST: /transactions: senderAddress ${senderAddress} is invalid...`
  );

  const newAccntTx = blockchain.nodes[nodeIdx].accounts[
    accountIdx
  ].createTransaction(
    senderNodeId,
    senderAddress,
    recipientAddress,
    recipientNodeId,
    value,
    action,
    digitalSignature
  );

  blockchain.submitTransaction(newAccntTx, true);

  res.json(
    `Transaction from ${senderAddress} to ${recipientAddress} was added successfully`
  );
});

app.get("/nodes", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.nodes));
});

app.get("/transactionBuffer", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.transactionBuffer));
});

app.post("/nodes", (req: express.Request, res: express.Response) => {
  const id = req.body.id;
  const url = new URL(req.body.url);

  if (!id || !url) {
    res.json("Invalid parameters!");
    res.status(500);
    return;
  }

  const node = new Node(id, url);

  if (blockchain.register(node)) {
    res.json(`Registered node: ${node}`);
  } else {
    res.json(`Node ${node} already exists!`);
    res.status(500);
  }
});

app.put("/nodes/consensus", (req: express.Request, res: express.Response) => {
  // Fetch the state of the other nodes.
  getConsensus(req, res, blockchain, nodeId);
  res.json(`${nodeId} consensus proogation is complete`);
});

// Start server
if (!module.parent) {
  app.listen(PORT);

  console.log(`Web server started on port ${PORT}. Node ID is: ${nodeId}`);
}
