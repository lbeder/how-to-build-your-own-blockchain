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

  blockchainController.on('activity', addActivity);
  blockchainController.on('newBlock', updateBlocks);
  blockchainController.on('init', updateBlocks);


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
      {blocks, activity, liveState, transaction},
      $(Index)
    )
    , appEl);
}
