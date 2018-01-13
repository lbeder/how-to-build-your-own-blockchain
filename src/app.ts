import * as uuidv4 from "uuid/v4";
import express from './shim/express';
import {routes} from './routes';
import {SimpleNode} from './simple-node';
import {NodeController} from './node-controller';

let controller: NodeController;
const onNewPeer = () => {
  controller.handleNewBlockNotifications();
};

const app = express();
const simpleNode = new SimpleNode(app, onNewPeer);
controller = new NodeController(simpleNode.peers);
routes(app, controller);

(<any>window).simpleNode = simpleNode;
(<any>window).peers = simpleNode.peers;
(<any>window).app = app;
(<any>window).controller = controller;

// require.ensure([], function (require: (module: string) => any) {
//   const main = require('./ui/main');
//   main.renderApp(controller);
// }, 'ui');

controller.init({
  miningAddress: uuidv4(),
  autoMining: true,
  autoConsensus: true
});
