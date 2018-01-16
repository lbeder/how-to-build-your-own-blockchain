const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fetch = require('node-fetch');
const EC = require('elliptic').ec;
const sha256 = require('js-sha256');
const _ = require('lodash');
const { TransactionGenerator } = require('./TransactionGenerator');
const { AppMenu } = require('./AppMenu');
const { Dialogs } = require('./dialogs');

let mainWindow;
let nodeUrl;
const wallets = [];
const addresses = [];

app.on('ready', () => {
  mainWindow = new BrowserWindow({width: 1000, height: 800});
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: 'true'
  }));

  Menu.setApplicationMenu(AppMenu.createMenu({
    showConnectToNodeWindow() {Dialogs.show('connectToNode')},
    showAddTransactionWindow,
    showAddPrivateKeyWindow() {Dialogs.show('addPrivateKey')},
    showAddAddressWindow() {Dialogs.show('addAddress')},
    reloadAll,
    mineNextBlock
  }));
  mainWindow.on('closed', () => mainWindow = null);
});

function showAddTransactionWindow() {
  const sources = _.map(wallets, (wallet) => ({name: wallet.name, address: wallet.publicHash}));
  Dialogs.show('addTransaction', {sources, destinations: addresses});
}

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.on('connectToNode', async (event, url) => {
  Dialogs.dismiss();
  nodeUrl = url;
  await reloadAll();
});

ipcMain.on('addTransaction', async (event, data) => {
  Dialogs.dismiss();
  const tmp = JSON.stringify(new TransactionGenerator(wallets).generate(data.from, data.to, data.value * 1000), null, 2);
  await fetch(`${nodeUrl}/transaction`, {
    headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
    method: 'POST',
    body: JSON.stringify(new TransactionGenerator(wallets).generate(data.from, data.to, data.value * 1000))
  });
  await reloadAll();
});

ipcMain.on('addPrivateKey', async (event, data) => {
  Dialogs.dismiss();
  data.publicHash = sha256(EC('secp256k1').keyFromPrivate(data.private).getPublic('hex'));
  wallets.push(data);
  addresses.push({
    address: data.publicHash,
    name: data.name
  });
  await reloadAll();
});

ipcMain.on('addAddress', async (event, data) => {
  Dialogs.dismiss();
  addresses.push(data);
  await reloadAll();
});

async function mineNextBlock() {
  await fetch(`${nodeUrl}/blocks/mine`, {method: 'POST'});
  await reloadAll();
}

async function reloadAll() {
  if (nodeUrl === undefined) {
    dialog.showMessageBox(mainWindow, {type: 'warning', buttons: ['Dismiss'], title: 'Not connected',
      message: 'No node selected, please connect to a node first'});
    return;
  }

  let blocks, pendingTransactions, unspentTransactions;

  try {
    blocks = await (await fetch(`${nodeUrl}/blocks`)).json();
    pendingTransactions = await (await fetch(`${nodeUrl}/transactions`)).json();
    for(let wallet of wallets) {
      wallet.unspentTransactions = await (await fetch(`${nodeUrl}/unspentTransactions/${wallet.publicHash}`)).json();
    }
  } catch (ex) {
    dialog.showMessageBox(mainWindow, {type: 'warning', buttons: ['Dismiss'], title: 'Connection error',
      message: `Couldn't connect to the node (${nodeUrl})`}); 
    return;
  }

  mainWindow.webContents.send('refreshBlocks', blocks);
  mainWindow.webContents.send('refreshTransactions', pendingTransactions);
  const walletsDisplayData = []
  for(let wallet of wallets) {
    wallet.balance = _.reduce(wallet.unspentTransactions, (sum, o) => sum + Number(o.value), 0);
    walletsDisplayData.push({
      name: wallet.name,
      address: wallet.publicHash,
      balance: wallet.balance / 1000
    });
  }
  mainWindow.webContents.send('refreshKeys', walletsDisplayData);
  mainWindow.webContents.send('refreshAddresses', addresses);
}
