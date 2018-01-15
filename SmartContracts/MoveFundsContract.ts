const MoveFundsAfterDateContract = {
  balance: 400,
  expirationDate: new Date("October 13, 2016 11:13:00"),
  id: 2,
  fromAddress: "Bob",
  call: function() {
    return { getBalance: this.balance, getFromAddress: this.fromAddress };
  },
  send: function() {
    return { changeBalance: this.changeBalance };
  },
  abi: function() {
    return { callables: this.call(), sendables: this.send() };
  },
  moveFunds: function() {
    var currentDate = new Date();
    if (currentDate > this.expirationDate) {
      console.log(currentDate, this.expirationDate, "moving funds....");
    }
    return {
      senderNodeId: "B",
      senderAddress: "Bob",
      recipientNodeId: "A",
      recipientAddress: "Alice",
      value: 20,
      action: "TRANSACTION_EXTERNAL_ACCOUNT"
    };
  }
};

const stringifiedContract = eval(
  '({balance: 400, expirationDate: new Date("October 13, 2016 11:13:00"),id: 2, fromAddress: "Bob", call: function() { return { getBalance: this.balance, getFromAddress: this.fromAddress }; }, send: function() { return { changeBalance: this.changeBalance }; }, abi: function() { return { callables: this.call(), sendables: this.send() }; }, moveFunds: function() { var currentDate = new Date(); if (currentDate > this.expirationDate) { console.log(currentDate, this.expirationDate, "moving funds....");} return { senderNodeId: "B", senderAddress: "Bob", recipientNodeId: "A", recipientAddress: "Alice", value: 20, action: "TRANSACTION_EXTERNAL_ACCOUNT" };} })'
);
