const CounterContract = {
  balance: 0,
  counter: 0,
  incrementValue: function() {
    this.counter++;
  },
  id: 1,
  fromAddress: "Alice",
  call: function() {
    return {
      getBalance: this.balance,
      getFromAddress: this.fromAddress
    };
  },
  send: function() {
    return {
      incrementValue: this.incrementValue
    };
  },
  abi: function() {
    return {
      sendables: this.incrementValue.toString()
    };
  }
};

const stringifiedCounterContract =
  '({ balance: 1000, incrementValue: function() { this.balance++; }, id: 1, fromAddress: "Alice", call: function() { return {getBalance: this.balance, getFromAddress: this.fromAddress}}, send: function() { return { incrementValue: this.incrementValue} }, abi: function() { return {sendables: this.incrementValue.toString()} } })';
