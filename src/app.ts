import express from './shim/express';
import {routes} from './routes';
import {SimpleNode} from './simple-node';
import {NodeController} from './node-controller';
import {Wallet} from './wallet';
import {Crypto} from "./crypto";

const main = require('./ui/main');

async function init() {
  let controller: NodeController;
  const onPeersChanged = () => {
    controller.handlePeersChanged();
  };

  const app = express();
  const simpleNode = new SimpleNode(app, onPeersChanged);
  controller = new NodeController(simpleNode.peers);
  routes(app, controller);
  const myWallet = new Wallet(controller);
  await myWallet.init();

  (<any>window).simpleNode = simpleNode;
  (<any>window).peers = simpleNode.peers;
  (<any>window).app = app;
  (<any>window).controller = controller;
  (<any>window).wallet = myWallet;
  (<any>window).mycrypt = new Crypto();

  main.renderApp(controller, myWallet);

  controller.init({
    miningAddress: myWallet.myAddress,
    autoMining: true,
    autoConsensus: true
  });
}

init()
  .catch(err => console.error(err));


// avoid stale peers
setTimeout(() => window.location.reload(), 1000 * 60 * 30);
