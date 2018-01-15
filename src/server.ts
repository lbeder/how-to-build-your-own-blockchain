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
  isCrossOriginRequest,
  getPublicKey,
  encryptPasswords
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

app.get(
  "/publicKey/:node/:accountName",
  (req: express.Request, res: express.Response) => {
    const { node, accountName } = req.params;
    console.log(`Account name: ${accountName}`);
    const pubkey = getPublicKey(blockchain, node, accountName);
    res.json(pubkey);
  }
);

app.get(
  "/encryptPassword/:password",
  (req: express.Request, res: express.Response) => {
    const { password } = req.params;
    const encryptedPasswordDictionary = encryptPasswords(blockchain, password);
    res.json(encryptedPasswordDictionary);
  }
);

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
    console.log(
      `Created:
      Account:${address}
      Type: ${account_type}
      Balance: ${balance}`
    );
    res.end();
  }
);

app.get("/contracts", (req: express.Request, res: express.Response) => {
  const contracts = blockchain.getContracts();
  res.json(contracts);
});

app.post("/deployContract", (req: express.Request, res: express.Response) => {
  const { contractName, contract, value, type } = req.body;
  blockchain.submitContract(contractName, value, type, contract);
  res.end();
});

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
    res.json(`Successfully deployed ${address} contract`);
  }
);

app.put(
  "/mutateContract/:address",
  (req: express.Request, res: express.Response) => {
    const { address } = req.params;
    const {
      method,
      initiaterNode,
      initiaterAddress,
      value,
      action,
      args
    } = req.body;

    const { nodeIdx, accountIdx } = getNodeAndContractIndex(
      blockchain.nodes,
      nodeId,
      address,
      "Could not find contract node or address"
    );

    const digitalSignature = getDigitalSignature(
      blockchain.nodes,
      initiaterNode,
      initiaterAddress,
      action
    );

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
        method,
        args,
        digitalSignature
      ),
      false
    );

    res.end();
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
  // if (isCrossOriginRequest(senderNodeId, nodeId)) {
  //   console.log(
  //     `Cross Origin Requests are prohibited ${senderNodeId} ${nodeId}`
  //   );
  //   return;
  // }
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

  res.end();
});

app.get("/nodes", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.nodes));
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
  res.end();
});

// Start server
if (!module.parent) {
  app.listen(PORT);

  console.log(`Web server started on port ${PORT}. Node ID is: ${nodeId}`);
}
