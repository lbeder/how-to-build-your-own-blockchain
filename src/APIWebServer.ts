import {Blockchain} from "./Blockchain";
import {Block} from "./Block";
import {Node} from "./Node";
import {Wallet} from "./Wallet";
import {Address} from "./Address";
import { serialize, deserialize } from "serializer.ts/Serializer";
import { URL } from "url";
import axios from "axios";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as uuidv4 from "uuid/v4";
import * as parseArgs from "minimist";
import { MultiSigWallet } from "./MultiSigWallet";


const ARGS = parseArgs(process.argv.slice(2));
const PORT = ARGS.port || 3000;
const app = express();
const nodeId = ARGS.id || uuidv4();
const blockchain = new Blockchain(nodeId);

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
  const txFeeThreshold = req.body.txFeeThreshold;
  if (!txFeeThreshold)  {
    res.json("Invalid parameters! 'txFeeThreshold' is missing");
    res.status(500);
    return;
  }
  const newBlock = blockchain.createBlock(txFeeThreshold);
  const difficulty = blockchain.getDifficulty();
  res.json(`Mined new block #${newBlock.blockNumber}. Mining difficulty was ${difficulty}. Transaction fee threshold is ${txFeeThreshold}`);

});

// Show all transactions in the transaction pool.
app.get("/transactions", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.transactionPool));
});

app.post("/transactions", (req: express.Request, res: express.Response) => {
  const senderAddress = new Address(req.body.senderAddress);
  const recipientAddress = new Address(req.body.recipientAddress);
  const transactionMessage = req.body.transactionMessage;
  const transactionFee = req.body.transactionFee;
  const value = Number(req.body.value);

  if (!senderAddress || !recipientAddress || !transactionFee || !value)  {
    res.json("Invalid parameters!");
    res.status(500);
    return;
  }

  if(transactionFee > value) {
    res.json("Invalid transaction! transaction fee is higher than the transaction value");
    res.status(500);
    return;
  }

  if(!blockchain.validAddresses(senderAddress, recipientAddress)) {
    
    res.json(`Invalid transaction! please check that you submitted valid sender and recipient addresses`);
    res.status(500);
    return;
  }

  blockchain.submitTransaction(senderAddress, recipientAddress, transactionFee, value, transactionMessage);

  res.json(`Transaction from ${senderAddress.id} to ${recipientAddress.id} was added successfully`);
});

app.post("/createMultisigWallet", (req: express.Request, res: express.Response) => {
  const publicKeys = req.body.publicKeys;
  const publicKey_A = new Address(publicKeys.publicKey_A);
  const publicKey_B = new Address(publicKeys.publicKey_B);
  const publicKey_C = new Address(publicKeys.publicKey_C);

  if(!blockchain.validateMultiSigPublicKeys(publicKey_A, publicKey_B, publicKey_C)) {
    res.json(`Invalid publicKeys! Did not create multiSig wallet`);
  }

  const multiSigAddress = MultiSigWallet.generateMultiSigAddress(publicKey_A, publicKey_B, publicKey_C);
  const multiSigPublicKeys = [publicKey_A, publicKey_B, publicKey_C];
  const multiSigWallet = new MultiSigWallet(multiSigAddress, multiSigPublicKeys);
  
  blockchain.registerWallet(multiSigWallet);

  res.json(`Created multisig wallet with address: ${multiSigAddress.id}`);
});

app.post("/multisigtransaction", (req: express.Request, res: express.Response) => {

  const multiSigAddress = new Address(req.body.multiSigAddress);

  const privateKeys = req.body.privateKeys;
  const privateKey_1 = new Address(privateKeys.privateKey_1);
  const privateKey_2 = new Address(privateKeys.privateKey_2);

  const transaction = req.body.transaction;
  const recipientAddress = new Address(transaction.recipientAddress);
  const transactionMessage = transaction.transactionMessage;
  const transactionFee = transaction.transactionFee;
  const value = Number(transaction.value);

  const wallet = blockchain.wallets.find(w => w.address.id == multiSigAddress.id);

  if(wallet && wallet instanceof MultiSigWallet) {

    if(!blockchain.validateMultiSigTransaction(wallet.multiSigPublicKeys[0], wallet.multiSigPublicKeys[1], wallet.multiSigPublicKeys[2],
      privateKey_1, privateKey_2)) {
  
      res.json(`Invalid multiSig transaction! Incorrect keys!`);
      res.status(500);
      return;
    }

    if(!blockchain.validAddresses(multiSigAddress, recipientAddress)) {

      res.json(`Invalid transaction! please check that you submitted valid sender and recipient addresses`);
      res.status(500);
      return;
    }

    blockchain.submitTransaction(multiSigAddress, recipientAddress, transactionFee, value, transactionMessage);
    res.json(`Transaction from multisig wallet: ${multiSigAddress.id} to ${recipientAddress.id} was added successfully`);
    return;
  }

  res.json(`Invalid transaction! please check that your multiSig wallet exists!`);
  res.status(500);
  return;
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

app.post("/createWallet", (req: express.Request, res: express.Response) => {

  const wallet = new Wallet();
  blockchain.registerWallet(wallet);

  res.json(`Registered wallet: ${wallet}`);

});

app.get("/wallets", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.wallets));
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
      res.json(`Node ${nodeId} has reached a consensus on a new state.`);
    } else {
      res.json(`Node ${nodeId} hasn't reached a consensus on the existing state.`);
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

if (!module.parent) {
  app.listen(PORT);

  console.log(`Web server started on port ${PORT}. Node ID is: ${nodeId}`);
}