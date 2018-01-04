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
import { Address, CONTRACT_ACCOUNT } from "./address";
import { Contract } from "./contract";
import { Transaction } from "./transaction";
import { Block } from "./block";
import { Node } from "./node";
import { Blockchain } from "./blockchain";

const reviver = (key: any, value: any) => {
  if (typeof value === "string" && value.indexOf("function ") === 0) {
    let functionTemplate = `(${value})`;
    return eval(functionTemplate);
  }
  return value;
};

const replacer = (key: any, value: any) => {
  if (typeof value === "function") {
    return value.toString();
  }
  return value;
};

function objToString(obj: any, ndeep: number): any {
  if (obj == null) {
    return String(obj);
  }
  switch (typeof obj) {
    case "string":
      return '"' + obj + '"';
    case "function":
      return obj.name || obj.toString();
    case "object":
      var indent = Array(ndeep || 1).join("\t"),
        isArray = Array.isArray(obj);
      return (
        "{["[+isArray] +
        Object.keys(obj)
          .map(function(key) {
            return (
              "\n\t" +
              indent +
              key +
              ": " +
              objToString(obj[key], (ndeep || 1) + 1)
            );
          })
          .join(",") +
        "\n" +
        indent +
        "}]"[+isArray]
      );
    default:
      return obj.toString();
  }
}

const getConsensus = (req: express.Request, res: express.Response) => {
  const requests = blockchain.nodes
    .filter(node => node.id !== nodeId)
    .map(node => {
      const req = axios.get(`${node.url}blocks`);
      return req;
    });

  if (requests.length === 0) {
    res.json("There are no nodes to sync with!");
    res.status(404);

    return;
  }

  axios
    .all(requests)
    .then(
      axios.spread((...blockchains) => {
        if (
          blockchain.consensus(
            blockchains.map(res => deserialize<Block[]>(Block, res.data))
          )
        ) {
          res.json(`Node ${nodeId} has reached a consensus on a new state.`);
        } else {
          res.json(`Node ${nodeId} could not find a better candidate.`);
        }

        res.status(200);
        return;
      })
    )
    .catch(err => {
      console.log(err);
      res.status(500);
      res.json(err);
      return;
    });

  res.status(500);
};

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
  const { address, balance, type, nodeId } = req.body;
  const createdNode = blockchain.createAccount(address, balance, type, nodeId);

  // Verify creation of Node
  if (!createdNode) {
    res.json(
      `CreateAccount Failed to create node with address ${address}, balance ${balance}, type ${type} `
    );
    res.status(404);
    return;
  }

  // Success msg
  res.json(
    `Creation of account ${address} of type ${type} with balance ${balance}`
  );
});

// TODO: Omer
app.post(
  "/propogateAccountCreation",
  (req: express.Request, res: express.Response) => {
    const { address, balance, type, nodeId } = req.body;
    const createdNode = blockchain.createAccount(
      address,
      balance,
      type,
      nodeId
    );

    // Verify creation of node
    if (!createdNode) {
      res.json(
        `PropogateAccountCreation failed to create node with address ${address}, balance ${balance}, type ${type} `
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
          type: type
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
      `Propogated creation of account ${address} of type ${type} with balance ${balance}`
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
  blockchain.submitContract(contractName, value, type, eval(contract));
  res.json(JSON.stringify(`${nodeId} deployed contracts!`));
});

// TODO: Omer
app.post(
  "/propogateContract",
  (req: express.Request, res: express.Response) => {
    const { contractName, value, type, data } = req.body;
    const contract = eval(data);
    blockchain.submitContract(contractName, value, type, data);

    const requests = blockchain.nodes
      .filter(node => node.id !== nodeId)
      .map(node =>
        axios.post(`${node.url}deployContract`, {
          contractName: contractName,
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

    res.json(contract.abi());
  }
);

// Show all transactions in the transaction pool.
app.get("/transactions", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.transactionPool));
});

app.post("/transactions", (req: express.Request, res: express.Response) => {
  const {
    senderAddress,
    recipientAddress,
    type,
    method,
    args,
    gas,
    data
  } = req.body;
  const value = Number(req.body.value);

  if (!senderAddress || !recipientAddress || !value) {
    res.json("Invalid parameters!");
    res.status(500);
    return;
  }

  blockchain.submitTransaction(
    senderAddress,
    recipientAddress,
    value,
    type,
    method,
    args,
    gas,
    data
  );

  res.json(
    `Transaction from ${senderAddress} to ${recipientAddress} was added successfully`
  );
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

app.put(
  "/mutateContract/:address",
  (req: express.Request, res: express.Response) => {
    const { address } = req.params;
    const { method } = req.body;
    let parsedContract;
    const nodeIdx = blockchain.nodes.findIndex(node => node.id === nodeId);
    if (nodeIdx === -1) {
      res.json(`Invalid ${nodeId}...`);
      res.status(404);
      return;
    }

    // Find contract by address
    const contractIdx = blockchain.nodes[nodeIdx].accounts.findIndex(
      account =>
        (account.address = address && account.type === CONTRACT_ACCOUNT)
    );
    if (contractIdx === -1) {
      res.json(`Invalid ${contractIdx}...`);
      res.status(404);
      return;
    }

    // Parse Contract Data (Code)
    if (blockchain.nodes[nodeIdx].accounts[contractIdx].nonce === 0) {
      parsedContract = eval(
        blockchain.nodes[nodeIdx].accounts[contractIdx].data
      );
    } else {
      parsedContract = JSON.parse(
        blockchain.nodes[nodeIdx].accounts[contractIdx].data,
        reviver
      );
    }

    // Mutate Data
    parsedContract[method]();

    // Update Contract State
    blockchain.nodes[nodeIdx].accounts[contractIdx].data = JSON.stringify(
      parsedContract,
      replacer
    );
    blockchain.nodes[nodeIdx].accounts[contractIdx].nonce++;

    // Create Transaction
    const {
      senderAddress,
      recipientAddress,
      value,
      methodType,
      args,
      gas
    } = req.body;

    // Add transaction to blockchain
    const transaction = blockchain.submitTransaction(
      senderAddress,
      recipientAddress,
      value,
      methodType,
      method,
      args,
      gas,
      "NONE"
    );

    // TODO: mine transaction...

    // Init consensus
    // getConsensus(req, res);
    res.json(blockchain.nodes[nodeIdx].accounts[contractIdx]);
  }
);

app.get(
  "/contract/:contractId/abi",
  (req: express.Request, res: express.Response) => {
    const contractId = req.params.contractId;
    const nodeIdx = blockchain.nodes.findIndex(node => node.id === nodeId);
    const contractIdx = blockchain.nodes[nodeIdx].accounts.findIndex(
      account => (account.id = contractId)
    );
    if (contractIdx === -1) {
      res.json(`Oops...Contract ${contractId} does not exist`);
      res.status(404);
    }
    res.json(
      JSON.stringify(
        this.nodes[nodeIdx].accounts[contractIdx].data.abi(),
        replacer,
        4
      )
    );
    //  blockchain.contracts.find
  }
);

app.put("/nodes/consensus", (req: express.Request, res: express.Response) => {
  // Fetch the state of the other nodes.
  getConsensus(req, res);
});

// Start server
if (!module.parent) {
  app.listen(PORT);

  console.log(`Web server started on port ${PORT}. Node ID is: ${nodeId}`);
}
