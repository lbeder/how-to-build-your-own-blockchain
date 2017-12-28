import { sha256 } from "js-sha256";
import { serialize, deserialize } from "serializer.ts/Serializer";
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


// suggestions
// 1. validate unspent amount in senderAddress - todo
// 2. validate address exists and registered before sending to it - done
// 3. create personal names for the addresses (ohads-personal) - done 

export class PublicData{
    public blockchain:  Array<Block>;
    public addresses:  Array<Address>;

    constructor(blocks: Array<Block>, addresses: Array<Address>){
        this.blockchain = blocks;
        this.addresses = addresses;
    }
}


export class Address {
  public publicKey: string;
  public prettyName: string;
  public date: number;

  // private privateKey: string,
  constructor(prettyName?: string, publicKey?: string){
    // generate a public key (todo, private key as well)
   // and pair it to the pretty name, if passed
    if (prettyName){
      this.prettyName = prettyName
    }
    if (publicKey){
        this.publicKey = publicKey
    }else{
        this.publicKey = uuidv4();
        this.date = Blockchain.now();
    }

  }

  public updatePrettyName(prettyName: string, publicAddress: string): string {
      throw new Error("Not yet implemented!");
  }

  public validateAddress(){
      throw new Error("Not yet implemented!");
  }

  public mostPrettyName(){
    return this.prettyName || this.publicKey
  }

  public isSameAddress(addressToMatch: Address) {
      return ((this.publicKey == addressToMatch.publicKey) || (this.prettyName == addressToMatch.prettyName))
  }

}

export class Transaction {
  public senderAddress: Address;
  public recipientAddress: Address;
  public value: number;

  constructor(senderAddress: Address, recipientAddress: Address, value: number) {


    this.senderAddress = senderAddress;
    this.recipientAddress = recipientAddress;
    this.value = value;
  }
}

export class Block {
  public blockNumber: number;
  public transactions: Array<Transaction>;
  public timestamp: number;
  public nonce: number;
  public prevBlock: string;

  constructor(blockNumber: number, transactions: Array<Transaction>, timestamp: number, nonce: number,
    prevBlock: string) {
    this.blockNumber = blockNumber;
    this.transactions = transactions;
    this.timestamp = timestamp;
    this.nonce = nonce;
    this.prevBlock = prevBlock;
  }

  // Calculates the SHA256 of the entire block, including its transactions.
  public sha256(): string {
    return sha256(JSON.stringify(serialize<Block>(this)));
  }
}

export class Node {
  public id: string;
  public url: URL;

  constructor(id: string, url: URL) {
    this.id = id;
    this.url = url;
  }

  public toString(): string {
      return `${this.id}:${this.url}`;
  }
}

export class Blockchain {
  // Let's define that our "genesis" block as an empty block, starting from the January 1, 1970 (midnight "UTC").
  public static readonly GENESIS_BLOCK = new Block(0, [], 0, 0, "fiat lux");

  public static readonly DIFFICULTY = 4;
  public static readonly TARGET = 2 ** (256 - Blockchain.DIFFICULTY);

  public static readonly MINING_SENDER = new Address("<COINBASE>");
  public static readonly MINING_REWARD = 50;

  public nodeId: Address;
  public nodes: Set<Node>;
  public blocks: Array<Block>;
  public transactionPool: Array<Transaction>;
  public addresses: Array<Address>; // should be a type of map, not an array, for better performance
  private storagePath: string;

  constructor(nodeId: string) {
    this.nodeId = new Address(undefined, nodeId);
    this.nodes = new Set<Node>();
    this.transactionPool = [];
    this.addresses = [];

    this.storagePath = path.resolve(__dirname, "../", `${this.nodeId.publicKey}.blockchain`);

    // Load the blockchain from the storage.
    this.load();
  }

  // Registers new node.
  public register(node: Node): boolean {
    return this.nodes.add(node);
  }

  // Saves the blockchain to the disk.
  private save() {
      const data ={
        blockchain: serialize(this.blocks),
        addresses: serialize(this.addresses)
      };
    fs.writeFileSync(this.storagePath, JSON.stringify(data, undefined, 2), "utf8");
  }

  // Loads the blockchain from the disk.
  private load() {
    try {
      const data = this.getAllPublicData();
      const blocks = data['blockchain'];
      const addresses = data['addresses'];
      this.blocks = deserialize<Block[]>(Block, blocks);
      this.addresses = deserialize<Address[]>(Address, addresses);
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }

      this.blocks = [Blockchain.GENESIS_BLOCK];
      this.addresses = [];
    } finally {
      this.verify();
    }
  }

  // Verifies the blockchain.
  public static verify(blocks: Array<Block>): boolean {
    try {
      // The blockchain can't be empty. It should always contain at least the genesis block.
      if (blocks.length === 0) {
        throw new Error("Blockchain can't be empty!");
      }

      // The first block has to be the genesis block.
      if (!deepEqual(blocks[0], Blockchain.GENESIS_BLOCK)) {
        throw new Error("Invalid first block!");
      }

      // Verify the chain itself.
      for (let i = 1; i < blocks.length; ++i) {
        const current = blocks[i];

        // Verify block number.
        if (current.blockNumber !== i) {
          throw new Error(`Invalid block number ${current.blockNumber} for block #${i}!`);
        }

        // Verify that the current blocks properly points to the previous block.
        const previous = blocks[i - 1];
        if (current.prevBlock !== previous.sha256()) {
          throw new Error(`Invalid previous block hash for block #${i}!`);
        }

        // Verify the difficutly of the PoW.
        //
        // TODO: what if the diffuclty was adjusted?
        if (!this.isPoWValid(current.sha256())) {
          throw new Error(`Invalid previous block hash's difficutly for block #${i}!`);
        }
      }

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  // Verifies the blockchain.
  private verify() {
    // The blockchain can't be empty. It should always contain at least the genesis block.
    if (!Blockchain.verify(this.blocks)) {
      throw new Error("Invalid blockchain!");
    }
    // Todo, verify addresses as well as verifying blocks
  }

  // Receives candidate blockchains, verifies them, and if a longer and valid alternative is found - uses it to replace
  // our own.
  public consensus(blockchains: Array<PublicData>): boolean {

    // Iterate over the proposed candidates and find the longest, valid, candidate.
    let maxLength: number = 0;
    let bestCandidateIndex: number = -1;

    for (let i = 0; i < blockchains.length; ++i) {
      const candidate = blockchains[i].blockchain;
      const addresses = blockchains[i].addresses;

      // Don't bother validating blockchains shorther than the best candidate so far.
      if (candidate.length <= maxLength) {
        continue;
      }

      // Found a good candidate?
      if (Blockchain.verify(candidate)) {
        maxLength = candidate.length;
        bestCandidateIndex = i;
      }
    }
    // todo, figure out consensus algorithm for addresses
      // possibly merge all address. if duplicate, choose oldest one
    // Compare the candidate and consider to use it.
    if (bestCandidateIndex !== -1 && (maxLength > this.blocks.length || !Blockchain.verify(this.blocks))) {
      this.blocks = blockchains[bestCandidateIndex].blockchain;
      this.save();

      return true;
    }

    return false;
  }

  // Validates PoW.
  public static isPoWValid(pow: string): boolean {
    try {
      if (!pow.startsWith("0x")) {
        pow = `0x${pow}`;
      }

      return new BigNumber(pow).lessThanOrEqualTo(Blockchain.TARGET.toString());
    } catch {
      return false;
    }
  }

  // Mines for block.
  private mineBlock(transactions: Array<Transaction>): Block {
    // Create a new block which will "point" to the last block.
    const lastBlock = this.getLastBlock();
    const newBlock = new Block(lastBlock.blockNumber + 1, transactions, Blockchain.now(), 0, lastBlock.sha256());

    while (true) {
      const pow = newBlock.sha256();
      console.log(`Mining #${newBlock.blockNumber}: nonce: ${newBlock.nonce}, pow: ${pow}`);

      if (Blockchain.isPoWValid(pow)) {
        console.log(`Found valid POW: ${pow}!`);
        break;
      }

      newBlock.nonce++;
    }

    return newBlock;
  }

  public validateTransaction(value: number, senderAddress?: string, senderPrettyName?: string,
                             recipientAddress?: string, recipientPrettyName?: string){

    // todo. value should be validated as well
    const senderAddressObj = this.findAddress(senderAddress, senderPrettyName);
    const recipientAddressObj = this.findAddress(recipientAddress, recipientPrettyName);

    if ((!senderAddressObj)){
        throw Error('failed to find sender Address!')
    }

    if ((!recipientAddressObj)){
        throw Error('failed to find recipient Address!')
    }

    if (senderAddressObj.publicKey == recipientAddressObj.publicKey){
        throw Error('sending money to yourself is useless!' + senderAddressObj.publicKey + ' == ' + recipientAddressObj.publicKey)
    }

    return {
        senderAddressObj: senderAddressObj,
        recipientAddressObj: recipientAddressObj,
    }

  }
  // Submits new transaction
  public submitTransaction(senderAddressObj: Address, recipientAddressObj: Address, value: number) {
    this.transactionPool.push(new Transaction(senderAddressObj, recipientAddressObj, value));
  }

  // Creates new block on the blockchain.
  public createBlock(): Block {
    // Add a "coinbase" transaction granting us the mining reward!
    const transactions = [new Transaction(Blockchain.MINING_SENDER, this.nodeId, Blockchain.MINING_REWARD),
      ...this.transactionPool];

    // Mine the transactions in a new block.
    const newBlock = this.mineBlock(transactions);

    // Append the new block to the blockchain.
    this.blocks.push(newBlock);

    // Remove the mined transactions.
    this.transactionPool = [];

    // Save the blockchain to the storage.
    this.save();

    return newBlock;
  }
  
  public findAddress(publicKey?: string, prettyName?: string): Address{
      const addressToFind = new Address(prettyName, publicKey);

      for(let i=0; i<this.addresses.length; i++){
          if (this.addresses[i].isSameAddress(addressToFind)){
              return this.addresses[i];
          }
      }
      return;
  }

  public getLastBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  public static now(): number {
    return Math.round(new Date().getTime() / 1000);
  }

  public addANewAddress(address: Address): boolean{
      /// todo. a smarter push that validates existing pretty name to ensure no duplicates
      this.addresses.push(address);
      this.save();

      return true
  }

  public getAllPublicData() {
      return JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
  }

}

// Web server:
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

// Show all the blockchain data.
app.get("/data", (req: express.Request, res: express.Response) => {
    // todo, better to read from memory instead from disk

    const data = blockchain.getAllPublicData();
    res.json(serialize(data));
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

app.post("/transactions", (req: express.Request, res: express.Response) => {

  const senderAddress = req.body.senderAddress;
  const senderPrettyName = req.body.senderPrettyName;
  const recipientAddress = req.body.recipientAddress;
  const recipientPrettyName = req.body.recipientPrettyName;
  const value = Number(req.body.value);


  // todo possible improvement. check valid addresses
  // check sender balance
  // another thing, payment request, that prepares the transaction and sends it only if sender approves
  // private key for authentication

  if (!(senderAddress || senderPrettyName) || !(recipientAddress || recipientPrettyName) || !value)  {
    res.json("Missing parameters!");
    res.status(500);
    return;
  }

  const result = blockchain.validateTransaction(value, senderAddress, senderPrettyName, recipientAddress, recipientPrettyName);
  blockchain.submitTransaction(result.senderAddressObj, result.recipientAddressObj, value);


  res.json(`Sent ${value} units from ${result.senderAddressObj.mostPrettyName()} to ${result.recipientAddressObj.mostPrettyName()} was added successfully`);
});

app.get("/nodes", (req: express.Request, res: express.Response) => {
  res.json(serialize(blockchain.nodes.toArray()));
});

app.post("/nodes", (req: express.Request, res: express.Response) => {
  // register a new node 
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
  const requests = blockchain.nodes.toArray().map(node => axios.get(`${node.url}data`));

  // todo, also sync addresses , not just blocks
  if (requests.length === 0) {
    res.json("There are nodes to sync with!");
    res.status(404);

    return;
  }

  axios.all(requests).then(axios.spread((...blockchains) => {
    if (blockchain.consensus(blockchains.map(res =>
         new PublicData(
              deserialize<Block[]>(Block, res.data.blockchain),
              deserialize<Address[]>(Address, res.data.addresses)
         )
    )))
    {
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


app.put('/address', (req: express.Request, res: express.Response) => {
    // create a new blockchain address
    // and registers it on the blockchain
    const prettyName = req.body.prettyName;
    const address = new Address(prettyName);

    const result = blockchain.addANewAddress(address);
    // todo, consider result
    res.json(`added a new address ${address.publicKey} with a pretty name of ${address.prettyName}.`);

    res.status(200);
    return;
});

if (!module.parent) {
  app.listen(PORT);

  console.log(`Web server started on port ${PORT}. Node ID is: ${nodeId}`);
}



