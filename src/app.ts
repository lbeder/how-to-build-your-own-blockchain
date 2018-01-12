import * as uuidv4 from "uuid/v4";
import {Blockchain} from './blockchain';
import express from './shim/express';
import {routes} from './routes';
import {SimpleNode} from './simple-node';
import {NodeController} from './node-controller';

const nodeId = uuidv4();
let controller: NodeController;
const onNewPeer = () => {
  controller.handleNewBlockNotifications();
};

const app = express();
const blockchain = new Blockchain(nodeId);
const simpleNode = new SimpleNode(app, onNewPeer);
controller = new NodeController(blockchain, simpleNode.peers);
routes(app, controller);

(<any>window).blockChain = blockchain;
(<any>window).simpleNode = simpleNode;
(<any>window).peers = simpleNode.peers;
(<any>window).app = app;
(<any>window).controller = controller;
