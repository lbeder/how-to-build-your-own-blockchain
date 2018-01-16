import { sha256 } from 'js-sha256';
import * as express from "express";
import * as bodyParser from "body-parser";
import { serialize, deserialize } from 'serializer.ts/Serializer';
import { Blockchain } from './Blockchain';
import { Node } from './Node';
import axios from "axios";
import { Block } from './Block';
import { Transaction } from './Transaction';

export function startWebServer(blockchain: Blockchain, port: Number) {
  const app = express();
  // Set up bodyParser:
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
  
    res.status(500);
  });
  
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
  
  // Show all transactions in the transaction pool.
  app.get("/transactions", (req: express.Request, res: express.Response) => {
    res.json(serialize(blockchain.transactionPool));
  });
  
  app.post("/transaction", (req: express.Request, res: express.Response) => {
    let transaction;
    try {
      transaction = deserialize<Transaction>(Transaction, req.body);
    } catch (ex) {
      res.json(`Invalid parameters! ex: ${ex}`);
      res.status(500);
      return;
    }
    if (blockchain.submitTransaction(transaction)) {
      res.json(`Transaction was added successfully: ${JSON.stringify(req.body)}`);
    } else {
      res.json(`Transaction didn't pass validation: ${JSON.stringify(req.body)}`);
    }
  });
  
  app.get("/nodes", (req: express.Request, res: express.Response) => {
    res.json(serialize(blockchain.nodes.toArray()));
  });
  
  app.post("/nodes", (req: express.Request, res: express.Response) => {
    const id = req.body.id;
    const url = new URL(req.body.url);
  
    if (!id || !url)  {
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
    const requests = blockchain.nodes.toArray().map(node => axios.get(`${node.url}blocks`));
  
    if (requests.length === 0) {
      res.json("There are nodes to sync with!");
      res.status(404);
  
      return;
    }
  
    axios.all(requests).then(axios.spread((...blockchains) => {
      if (blockchain.consensus(blockchains.map(res => deserialize<Block[]>(Block, res.data)))) {
        res.json(`Node ${blockchain.nodeId} has reached a consensus on a new state.`);
      } else {
        res.json(`Node ${blockchain.nodeId} hasn't reached a consensus on the existing state.`);
      }
  
      res.status(200);
      return;
    })).catch(err => {
      console.log(err);
      res.status(500);
      res.json(err);
      return;
    });
  
    res.status(500);
  });

  app.get('/unspentTransactions/:address', (req: express.Request, res: express.Response) => {
    res.json(blockchain.findUnspentTransactions(req.params.address));
  });
  
  app.listen(port);

  console.log(`Web server started on port ${port}. Node ID is: ${blockchain.nodeId}`);
};
