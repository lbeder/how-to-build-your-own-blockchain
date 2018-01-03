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
import { Address } from "./address";
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

const getConsensus = (req: express.Request, res: express.Response) => {
  const requests = blockchain.nodes
    .toArray()
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
  const { address, balance, type } = req.body;
  blockchain.createAccount(address, balance, type);
  res.json(
    `Registered account ${address} of type ${type} with balance ${balance}`
  );
});

// TODO: Omer
app.get("/contracts", (req: express.Request, res: express.Response) => {
  const contracts = blockchain.getContracts();
  res.json(contracts);
});

// TODO: Omer
app.post("/deployContract", (req: express.Request, res: express.Response) => {
  const { contract } = req.body;
  blockchain.submitContract(eval(contract));
  res.json(JSON.stringify(`${nodeId} deployed contracts!`));
});

// TODO: Omer
app.post(
  "/propogateContract",
  (req: express.Request, res: express.Response) => {
    const {
      contractName,
      senderAddress,
      recipientAddress,
      value,
      gas,
      type,
      data
    } = req.body;

    // const unevaluatedContract = Contract.fetchContractContent(contractName);
    const contract = eval(data);
    blockchain.submitContract(
      senderAddress,
      recipientAddress,
      value,
      gas,
      type,
      data
    );

    const requests = blockchain.nodes
      .toArray()
      .filter(node => node.id !== nodeId)
      .map(node =>
        axios.post(`${node.url}deployContract`, {
          contract: data
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

// TODO: Omer
app.post("/contracts/:id", (req: express.Request, res: express.Response) => {
  const stringifiedContract = req.body.data;

  if (!stringifiedContract) {
    res.json("Invalid stringified contract");
    res.status(500);
  }

  // TODO: Check if contract already exists before adding it
  blockchain.submitContract(stringifiedContract);
  res.json(
    `The following contract was added successfully, ${stringifiedContract}`
  );
});

// Show all transactions in the transaction pool.
app.get("/transactions", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.transactionPool));
});

app.post("/transactions", (req: express.Request, res: express.Response) => {
  const { senderAddress, recipientAddress, type } = req.body;
  const value = Number(req.body.value);

  if (!senderAddress || !recipientAddress || !value) {
    res.json("Invalid parameters!");
    res.status(500);
    return;
  }

  blockchain.submitTransaction(senderAddress, recipientAddress, value);

  res.json(
    `Transaction from ${senderAddress} to ${recipientAddress} was added successfully`
  );
});

app.get("/nodes", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.nodes.toArray()));
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
  "/mutateContract/:contractId",
  (req: express.Request, res: express.Response) => {
    const contractId = req.params.contractId;
    const contractIdx = blockchain.contracts.findIndex(
      c => (c.id = contractId)
    );

    if (contractIdx) {
      res.json(`Contract ${contractId} not found`);
      res.status(404);
      return;
    }

    // Mutate Data
    blockchain.contracts[contractIdx].incrementValue(111, 111);

    // Create Transaction
    const {
      senderAddress,
      recipientAddress,
      value,
      methodType,
      method,
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
      gas
    );

    // Init consensus
    getConsensus(req, res);
  }
);

app.get(
  "/contract/:contractId/abi",
  (req: express.Request, res: express.Response) => {
    const contractId = req.params.contractId;
    const contract = blockchain.contracts.find(
      contract => contract.id === contractId
    );
    if (!contract) {
      res.json(`Oops...Contract ${contractId} does not exist`);
      res.status(404);
    }
    res.json(JSON.stringify(contract.abi(), replacer, 4));
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
