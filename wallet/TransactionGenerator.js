const _ = require('lodash');
const sha256 = require('js-sha256');
const EC = require('elliptic').ec;

class TransactionGenerator {
  constructor(wallets) {
    this._wallets = wallets;
  }

  generate(fromAddress, toAddress, value) {
    const wallet = _.find(this._wallets, {publicHash: fromAddress});
    if (wallet.balance < value || value <= 0) return undefined;

    const [inputValue, inputs] = this._prepareInputs(wallet, value);
    const outputs = this._prepareOutputs(fromAddress, toAddress, value, inputValue);

    _.each(inputs, (input) => this._signInput(input, outputs, wallet.private));

    return {inputs, outputs};
  }

  _prepareInputs(wallet, value) {
    const inputs = [];
    let inputValue = 0;
    for (let transactionIndex = 0; transactionIndex < wallet.unspentTransactions.length; transactionIndex++) {
      const transaction = wallet.unspentTransactions[transactionIndex];
      inputValue += transaction.value;
      inputs.push({
        txid: transaction.txid,
        outputIndex: transaction.outputIndex
      });
      if(inputValue >= value) break;
    }

    return [inputValue, inputs];
  }

  _prepareOutputs(fromAddress, toAddress, value, inputValue) {
    const outputs = [{
      address: toAddress,
      value
    }];
    if(value < inputValue) outputs.push({
      address: fromAddress,
      value: inputValue - value
    });

    return outputs;
  }

  _signInput(input, outputs, privateKeyString) {
    const inputDataToSign = sha256(`${input.txid}|${input.outputIndex}`);
    const outputsParts = _.map(outputs, (output) => sha256(`${output.address}|${output.value}`));
    const outputsDataToSign = sha256(outputsParts.join('|'));
    const dataToSign = sha256(`${inputDataToSign}|${outputsDataToSign}`);

    const privateKey = new EC('secp256k1').keyFromPrivate(privateKeyString);
    input.signature = privateKey.sign(dataToSign).toDER('hex');
    input.fullPublicKey = privateKey.getPublic('hex');
  }
}

module.exports = {
  TransactionGenerator
}
