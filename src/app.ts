import * as uuidv4 from "uuid/v4";
import {Blockchain} from './blockchain';
import express from './shim/express';
import {routes} from './routes';
import {SimpleNode} from './simple-node';

const nodeId = uuidv4();

const app = express();
const blockChain = new Blockchain(nodeId);
const simpleNode = new SimpleNode(app);
routes(app, blockChain, simpleNode.peers);

(<any>window).blockChain = blockChain;
(<any>window).simpleNode = simpleNode;
(<any>window).peers = simpleNode.peers;
(<any>window).app = app;
