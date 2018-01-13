import {h as $, Component} from 'preact';
import {DOM} from 'preact-compat';
import {connect} from 'mobx-preact';
import cl from 'classnames';
import Paper from 'material-ui/Paper';
import Chip from 'material-ui/Chip';
import FontIcon from 'material-ui/FontIcon';
import {indigo200, indigoA700} from 'material-ui/styles/colors';
import {className} from './blocks-container.styl';
import {headerBlock} from './helpers.styl';

class Block {
  render({block, pending}) {
    const hash = block.sha256();

    const transactionsList = block.transactions.map(({senderAddress, recipientAddress, value}) => {
      return DOM.div({className: `${className}-transaction`},
        $(FontIcon, {
          className: 'material-icons',
          color: indigoA700
        }, 'local_atm'),
        `${senderAddress.slice(0, 10)} -> ${recipientAddress.slice(0, 10)} (${value}WC)`
      );
    });

    return $(Paper, {
        zDepth: 2,
        className: cl(`${className}-block`, pending && `${className}-pending`)
      },
      pending && DOM.div({className: `${className}-block-pending-title`}, 'MINING'),
      DOM.div({className: `${className}-block-arrow`},
        $(FontIcon, {
          className: 'material-icons',
          color: indigoA700
        }, 'forward')
      ),
      $(Chip, {
        className: `${className}-block-number`,
        backgroundColor: indigo200
      }, `#${block.blockNumber}`),
      DOM.div({className: `${className}-block-hash`, title: hash},
        $(FontIcon, {
          className: 'material-icons',
          color: indigo200
        }, 'fingerprint'),
        DOM.span(null, `Hash: ${hash}`)
      ),
      DOM.div({
          className: `${className}-block-nonce`,
          title: block.nonce
        },
        $(FontIcon, {
          className: 'material-icons',
          color: indigo200
        }, 'gesture'),
        `Nonce: ${block.nonce}`
      ),
      DOM.div({className: `${className}-block-time`},
        $(FontIcon, {
          className: 'material-icons',
          color: indigo200
        }, 'schedule'),
        `Timestamp: ${new Date(block.timestamp).toISOString()}`
      ),
      DOM.div({
          className: `${className}-block-previous`,
          title: block.prevBlock
        },
        $(FontIcon, {
          className: 'material-icons',
          color: indigo200
        }, 'extension'),
        DOM.span(null, `Previous Block: ${block.prevBlock}`)
      ),
      DOM.div({
          className: `${className}-block-transactions`
        },
        $(FontIcon, {
          className: 'material-icons',
          color: indigo200
        }, 'receipt'),
        DOM.div(null, `Transactions:`),
        DOM.div({className: `${className}-block-transactions-list`},
          ...transactionsList
        )
      )
    );
  }
}

const PendingBlock = connect(['liveState'], class PendingBlock {
  render({liveState}) {
    if (!liveState.isMining || !liveState.pendingBlock) return null;
    return $(Block, {block: liveState.pendingBlock, pending: true});
  }
});

class BlocksContainer extends Component {
  render({blocks, liveState}) {
    const blocksList = blocks.reverse().slice(0, 30).map(block => $(Block, {block}));

    return DOM.div({className},
      DOM.div({className: headerBlock},
        DOM.div({className: `${headerBlock}-title`}, 'Blocks')
      ),
      DOM.div({className: `${className}-blocks`},
        $(PendingBlock),
        ...blocksList
      )
    );
  }
}

export default connect(['blocks'], BlocksContainer);
