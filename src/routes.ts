import {deserialize, serialize} from "serializer.ts/Serializer";
import {NodeController} from './node-controller';
import {Transaction} from "./transaction";

export function routes(app: any, controller: NodeController) {
  // Show all the blocks.
  app.get("/blocks", (req: any, res: any) => {
    res.json(serialize(controller.getAllBlocks()));
  });

  // Show specific block.
  app.get("/blocks/:id", (req: any, res: any) => {
    res.json(serialize(controller.getBlock(req.params.id)));
  });

  // Show all transactions in the transaction pool.
  app.get("/transactions", (req: any, res: any) => {
    res.json(serialize(controller.getTransactions()));
  });

  app.post("/transactions", (req: any, res: any) => {
    const transaction = deserialize<Transaction>(Transaction,req.body);
    if (!transaction.verify()) {
      res.json({success: false, msg: 'Your transaction is no good'});
      return;
    }
    try {
      controller.submitTransaction(transaction);
      res.json({
        success: true,
        msg: `Transaction ${serialize(transaction)} was added successfully`
      });
    }
    catch (err) {
      res.json({success: false, msg: 'Your transaction is no good'});
    }
  });

  app.post("/new-block", (req: any, res: any) => {
    controller.handleNewBlockNotifications();
    res.json({success: true});
  });
}
