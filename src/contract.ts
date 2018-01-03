import * as path from "path";
import * as fs from "fs";
import TrustfundContract from "./contracts/TrustfundContract";
import DavinciPaintingContract from "./contracts/DavinciPaintingContract";
import Example from "./contracts/ExampleContract";

export class Contract {
  public contractName: string;
  public from: string;
  public address: string;
  public data: string;
  public gas: number;

  constructor(
    contractName: string,
    from: string,
    address: string,
    data: string,
    gas: number
  ) {
    this.contractName = contractName;
    this.from = from;
    this.address = address;
    this.data = data;
    this.gas = gas;
  }

  public static fetchContractContent(contractName: string): any {
    if (contractName === "TrustfundContract") return TrustfundContract;
    if (contractName === "Example") return Example;
    return DavinciPaintingContract;
  }

  public verifyContract(contractName: string): boolean {
    const contractPath = path.join(__dirname, "contracts", this.contractName);
    // const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    const contract = require("contractPath");
    console.log("************ CONTRACT ************");
    console.log(JSON.stringify(contract));
    return true;
  }

  public parseContract(): string {
    return JSON.parse(this.data);
  }

  public getCode(): string {
    return this.data;
  }
}
