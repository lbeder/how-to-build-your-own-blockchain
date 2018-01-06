import {deserialize, serialize} from "serializer.ts/Serializer";
import {Block} from './final';

export function routes(app: any, blockchain: any, peers: any) {
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

  app.put("/nodes/consensus", async (req: any, res: any) => {
    const nodes = blockchain.getAllNodes();

    if (nodes.length === 0) {
      res.json("There are no nodes to sync with!");
      res.status(404);
      return;
    }

    // Fetch the state of the other nodes.
    const blockchains = await Promise.all(Object.values(peers).map(node => node.fetch('/blocks')));

    const success = blockchain.consensus(blockchains.map(data => deserialize<Block[]>(Block, data)));

    if (success) {
      res.json(`Reached a consensus on a new state.`);
    } else {
      res.json(`Hasn't reached a consensus on the existing state.`);
    }
  });
}
