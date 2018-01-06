import {BlockChain} from './blockchain';
import express from './shim/express';
import router from './router';
import simpleNode from './simple-node';
import * as uuidv4 from "uuid/v4";

const nodeId = uuidv4();

const app = express();
const blockChain = new BlockChain(nodeId);
router(app, blockChain);
simpleNode(app);

(<any>window).blockChain = blockChain;


