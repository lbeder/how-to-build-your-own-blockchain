import {h as $, render} from 'preact';
import * as Mobx from 'mobx';
import Index from './index';
import {Provider} from 'mobx-preact';
import 'normalize.css';
import './app.css';

Mobx.useStrict(true);

const {observable, action, reaction} = Mobx;

const blocks = observable([]);
const activity = observable([]);
const liveState = observable({
  status: 'idle',
  isMining: false,
  pendingBlock: null,
  peers: 0,
  assign: action.bound(updates => {
    Object.assign(liveState, updates);
  })
});
const transaction = observable({
  myAddress: '',
  pendingTransaction: null,
  msg: '',
  errorMsg: '',
  sendTransaction: action.bound(transactionInfo => {
    transaction.pendingTransaction = transactionInfo;
  }),
  transactionError: action.bound(resultMsg => {
    transaction.msg = '';
    transaction.errorMsg = resultMsg;
  }),
  transactionSuccess: action.bound(resultMsg => {
    transaction.msg = resultMsg;
    transaction.errorMsg = '';
  }),
  clearMsg: action.bound(() => {
    transaction.msg = '';
    transaction.errorMsg = '';
  })
});
const actions = observable({
  autoMining: true,
  autoConsensus: true,
  isConsensusRunning: false,
  list: [],
  sendAction: action.bound(actionObj => {
    actions.list.push(actionObj);
  })
});

function blockchainBindings(blockchainController, myWallet) {
  const addActivity = action(({msg}) => {
    activity.push({
      msg,
      time: new Date()
    });
    if (activity.length > 50) {
      activity.splice(0, activity.length - 50);
    }
  });

  const updateBlocks = action(() => {
    blocks.splice(0, blocks.length);
    blocks.push(...blockchainController.getAllBlocks());
  });
  const updateConfig = action(() => {
    actions.autoConsensus = blockchainController.config.autoConsensus;
    actions.autoMining = blockchainController.config.autoMining;
  });

  blockchainController.on('activity', addActivity);
  blockchainController.on('newBlock', updateBlocks);
  blockchainController.on('init', () => {
    updateBlocks();
    updateConfig();
  });

  // liveState updates might be too fast - limit them to RAF
  let pendingUpdates = {};
  blockchainController.on('liveState', action(state => {
    Object.assign(pendingUpdates, state);
  }));
  const onRAF = action(() => {
    window.requestAnimationFrame(onRAF);
    if (!Object.keys(pendingUpdates).length) return;

    liveState.assign(pendingUpdates);
    pendingUpdates = {};
  });
  onRAF();

  reaction(
    () => transaction.pendingTransaction,
    pendingTransaction => {
      if (!pendingTransaction) return;

      transaction.pendingTransaction = null;
      const {from, to, value} = pendingTransaction;
      myWallet.createSignedTransaction(from, to, value)
        .then(action(() => {
          transaction.transactionSuccess('Transaction submitted');
        }))
        .catch(action(err => {
          transaction.transactionError(err.message || 'Failed to submit transaction');
        }));
    });

  reaction(
    () => actions.list.length,
    () => {
      while (actions.list.length) {
        const {type, args} = actions.list.shift();

        switch (type) {
          case 'consensus':
            actions.isConsensusRunning = true;
            const onConsensusDone = action(() => {
              actions.isConsensusRunning = false;
            });
            blockchainController.consensus()
              .then(onConsensusDone, onConsensusDone);
            break;
          case 'mineOneBlock':
            blockchainController.startMining(true);
            break;
          case 'config':
            Object.assign(blockchainController.config, args);
            if (blockchainController.config.autoMining) {
              blockchainController.startMining();
            }
            else {
              blockchainController.stopMining();
            }
            break;
          default:
            console.warn(`Unknown action ${type}`);
            break;
        }
      }

      updateConfig();
    });

  // initial update
  updateBlocks();
  transaction.myAddress = myWallet.myAddress;
}

export function renderApp(blockchainController, myWallet) {
  const appEl = document.getElementById('app');

  // connect business logic to ui
  blockchainBindings(blockchainController, myWallet);

  // render the app
  render(
    $(
      Provider,
      {blocks, activity, liveState, transaction, actions},
      $(Index)
    )
    , appEl);
}
