const experiment =
  '({ balance: 1000, incrementValue: function() { this.balance++; }, id: 1, fromAddress: "Alice", call: function() { return {getBalance: this.balance, getFromAddress: this.fromAddress}}, send: function() { return { incrementValue: this.incrementValue} }, abi: function() { return {sendables: this.incrementValue.toString()} } })';
