import axios from "axios";

export class Example {
  public value: number;
  public id: string;

  constructor() {
    this.value = 0;
    this.id = "None";
  }
  incrementValue() {
    this.value++;
  }
  getValue() {
    return this.value;
  }
  abi() {
    return {
      callables: [this.getValue.toString()],
      sendables: [this.incrementValue.toString()]
    };
  }
}

export default new Example();

// TODO: call toString on methods for aBIs
