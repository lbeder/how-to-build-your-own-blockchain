const { BrowserWindow } = require('electron');
const url = require('url');
const path = require('path');

const Settings = {
  connectToNode: {
    width: 400,
    height: 200
  },

  addTransaction: {
    width: 400,
    height: 200
  },

  addPrivateKey: {
    width: 400,
    height: 200
  },

  addAddress: {
    width: 400,
    height: 200
  }
};

class Dialogs {
  constructor() {
    this._openDialog = undefined;
  }

  show(id, data = undefined) {
    if(this._openDialog !== undefined) return;

    const settings = Settings[id];
    this._openDialog = new BrowserWindow({width: settings.width, height: settings.height});
    this._openDialog.loadURL(url.format({
      pathname: path.join(__dirname, `${id}.html`),
      protocol: 'file:',
      slashes: 'true'
    }));

    if (data !== undefined) {
      this._openDialog.webContents.on('dom-ready', () => {
        this._openDialog.webContents.send('setData', data);
      })
    }

    this._openDialog.on('close', (event) => this._openDialog = undefined);
  }

  dismiss() {
    this._openDialog.close();
    this._openDialog = undefined;
  }
}

module.exports = {
  Dialogs: new Dialogs()
};
