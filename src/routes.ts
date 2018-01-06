import {deserialize, serialize} from "serializer.ts/Serializer";
import {Node} from './final';
import {fetch} from './fetch';

export function routes(app: any, blockchain: any) {
  // app.use(bodyParser.urlencoded({ extended: false }));
  // app.use(bodyParser.json());
  // app.use((err: any, req: any, res: any, next: express.NextFunction) => {
  //   console.error(err.stack);
  //
  //   res.status(500);
  // });

  // Show all the blocks.
  app.get("/blocks", (req: any, res: any) => {
    res.json(serialize(blockchain.blocks));
  });

  // Show specific block.
  app.get("/blocks/:id", (req: any, res: any) => {
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

  app.post("/blocks/mine", (req: any, res: any) => {
    // Mine the new block.
    const newBlock = blockchain.createBlock();

    res.json(`Mined new block #${newBlock.blockNumber}`);
  });

  // Show all transactions in the transaction pool.
  app.get("/transactions", (req: any, res: any) => {
    res.json(serialize(blockchain.transactionPool));
  });

  app.post("/transactions", (req: any, res: any) => {
    const senderAddress = req.body.senderAddress;
    const recipientAddress = req.body.recipientAddress;
    const value = Number(req.body.value);

    if (!senderAddress || !recipientAddress || !value) {
      res.json("Invalid parameters!");
      res.status(500);
      return;
    }

    blockchain.submitTransaction(senderAddress, recipientAddress, value);

    res.json(`Transaction from ${senderAddress} to ${recipientAddress} was added successfully`);
  });

  app.get("/nodes", (req: any, res: any) => {
    res.json(serialize(blockchain.nodes.toArray()));
  });

  app.post("/nodes", (req: any, res: any) => {
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

  app.put("/nodes/consensus", async (req: any, res: any) => {
    const nodes = blockchain.getAllNodes();

    if (nodes.length === 0) {
      res.json("There are no nodes to sync with!");
      res.status(404);
      return;
    }

    // Fetch the state of the other nodes.
    const blockchains = await Promise.all(nodes.map(({url}) => fetch(url, 'blocks')));

    const success = blockchain.consensus(blockchains.map(data => deserialize<Block[]>(Block, data)));

    if (success) {
      res.json(`Node ${nodeId} has reached a consensus on a new state.`);
    } else {
      res.json(`Node ${nodeId} hasn't reached a consensus on the existing state.`);
    }
  };
