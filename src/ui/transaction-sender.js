import {h as $, Component} from 'preact';
import {DOM} from 'preact-compat';
import {connect} from 'mobx-preact';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import {indigo500, fullWhite} from 'material-ui/styles/colors';
import FontIcon from 'material-ui/FontIcon';
import {className} from './transaction-sender.styl';
import {headerBlock} from './helpers.styl';

class TransactionSender extends Component {
  constructor() {
    super();
    this.fields = {};
  }

  onSubmitTransaction() {
    const transaction = this.props.transaction;
    const fields = this.fields;

    const value = Number(fields.value);

    if (!transaction.myAddress || !fields.to || !value || Number.isNaN(value)) {
      transaction.transactionError('Invalid transaction - please fill all fields');
      return;
    }

    transaction.clearMsg();
    transaction.sendTransaction({
      from: transaction.myAddress,
      to: fields.to,
      value: value
    });
  }

  onFieldChange(key, value) {
    this.fields[key] = value;
    this.props.transaction.clearMsg();
  }

  render({transaction}) {
    const isSubmitting = Boolean(transaction.pendingTransaction);

    return DOM.div(null,
      DOM.div({className: headerBlock},
        DOM.div({className: `${headerBlock}-title`}, 'Send Coins')
      ),
      DOM.div({className: `${className}-form`},
        DOM.div({className: `${className}-row`},
          DOM.span({className: `${className}-subtitle`}, 'FROM'),
          $(TextField,
            {
              name: 'send-coins-from',
              className: `${className}-input`,
              value: `${transaction.myAddress} (me)`,
              disabled: true
            }
          )
        ),
        DOM.div({className: `${className}-row`},
          $(FontIcon, {
            className: `material-icons ${className}-arrow`,
            color: 'rgba(0, 0, 0, 0.4)'
          }, 'forward')
        ),
        DOM.div({className: `${className}-row`},
          DOM.span({className: `${className}-subtitle`}, 'TO'),
          $(TextField,
            {
              name: 'send-coins-to',
              className: `${className}-input`,
              disabled: isSubmitting,
              onChange: e => this.onFieldChange('to', e.target.value)
            }
          )
        ),
        DOM.div({className: `${className}-row`},
          DOM.span({className: `${className}-subtitle`}, 'AMOUNT'),
          $(TextField,
            {
              name: 'send-coins-amount',
              className: `${className}-input`,
              type: 'number',
              disabled: isSubmitting,
              onChange: e => this.onFieldChange('value', e.target.value)
            }
          ),
          DOM.span(null, 'WC')
        ),
        DOM.div({className: `${className}-row`},
          transaction.msg && DOM.div({className: `${className}-msg`}, transaction.msg),
          transaction.errorMsg && DOM.div({className: `${className}-error-msg`}, transaction.errorMsg)
        ),
        DOM.div({className: `${className}-row`},
          $(RaisedButton,
            {
              backgroundColor: indigo500,
              className: `${className}-button`,
              disabled: isSubmitting,
              buttonStyle: {
                color: fullWhite
              },
              onClick: () => this.onSubmitTransaction()
            },
            'Send'
          )
        )
      )
    );
  }
}

export default connect(['transaction'], TransactionSender);
