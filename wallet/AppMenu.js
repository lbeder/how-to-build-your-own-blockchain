const { Menu } = require('electron');

class AppMenu {
  static createMenu(options) {
    const {
      showConnectToNodeWindow,
      showAddTransactionWindow,
      showAddPrivateKeyWindow,
      showAddAddressWindow,
      reloadAll,
      mineNextBlock
    } = options;

    const template = [
      {
        label: 'Blockchain',
        id: 'blockchain',
        submenu: [
          {label: 'Connect to node', accelerator: 'CommandOrControl+C', click: showConnectToNodeWindow},
          {label: 'Add transaction', accelerator: 'CommandOrControl+T', click: showAddTransactionWindow},
          {label: 'Add private key', accelerator: 'CommandOrControl+P', click: showAddPrivateKeyWindow},
          {label: 'Add address',     accelerator: 'CommandOrControl+A', click: showAddAddressWindow},
          {label: 'Reload all data', accelerator: 'CommandOrControl+R', click: reloadAll},
          {label: 'Mine next block', accelerator: 'CommandOrControl+M', click: mineNextBlock}
        ]
      },
      {
        label: 'Edit',
        submenu: [
          {role: 'undo'},
          {role: 'redo'},
          {type: 'separator'},
          {role: 'cut'},
          {role: 'copy'},
          {role: 'paste'},
          {role: 'pasteandmatchstyle'},
          {role: 'delete'},
          {role: 'selectall'}
        ]
      },
      {
        role: 'window',
        submenu: [
          {role: 'minimize'},
          {role: 'close'}
        ]
      }    
    ]

    if (process.platform === 'darwin') template.unshift({
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {role: 'services', submenu: []},
        {type: 'separator'},
        {role: 'hide'},
        {role: 'hideothers'},
        {role: 'unhide'},
        {type: 'separator'},
        {role: 'quit'}
      ]
    });

    return Menu.buildFromTemplate(template);
  }
}

module.exports = {AppMenu};
