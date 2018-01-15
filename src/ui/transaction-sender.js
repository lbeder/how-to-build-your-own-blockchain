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

    this.fields = {};
    this.forceUpdate();
  }

  onFieldChange(key, value) {
    this.fields[key] = value;
    const {msg, errorMsg} = this.props.transaction;
    if (msg || errorMsg) {
      this.props.transaction.clearMsg();
    }
    this.forceUpdate();
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
            color: '#3F51B5'
          }, 'forward')
        ),
        DOM.div({className: `${className}-row`},
          DOM.span({className: `${className}-subtitle`}, 'TO'),
          $(TextField,
            {
              name: 'send-coins-to',
              className: `${className}-input`,
              disabled: isSubmitting,
              value: this.fields.to,
              onChange: (e, newValue) => this.onFieldChange('to', newValue)
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
              value: this.fields.value,
              onChange: (e, newValue) => this.onFieldChange('value', newValue)
            }
          ),
          DOM.span(null, 'WBC')
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
