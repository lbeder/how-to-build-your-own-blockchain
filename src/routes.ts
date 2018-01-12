import {serialize} from "serializer.ts/Serializer";
import {NodeController} from './node-controller';

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
    const senderAddress = req.body.senderAddress;
    const recipientAddress = req.body.recipientAddress;
    const value = Number(req.body.value);

    controller.submitTransaction(senderAddress, recipientAddress, value);

    res.json({
      success: true,
      msg: `Transaction from ${senderAddress} to ${recipientAddress} was added successfully`
    });
  });

  app.post("/new-block", (req: any, res: any) => {
    controller.handleNewBlockNotifications();
    res.json({success: true});
  });
}
