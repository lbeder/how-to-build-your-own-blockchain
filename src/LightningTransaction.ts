import {Address} from "./Address";
import {LNSmartContract} from "./LNSmartContract";

export class LightningTransaction {
  public fundingAddress: string;
  public transactionAmount: number;
  public selfDestination: string;
  public selfValue: number;
  public otherDestination: string;
  public otherValue: number;
  public smartContract: LNSmartContract;

  constructor(fundingAddress: string, transactionAmount: number, otherDestination: string, otherValue: number, selfDestination: string, selfValue: number, smartContract: LNSmartContract){
  	this.fundingAddress = fundingAddress;
    this.transactionAmount = transactionAmount;
    this.otherDestination = otherDestination;
    this.otherValue = otherValue;
  	this.selfDestination = selfDestination;
  	this.selfValue = selfValue;
  	this.smartContract = smartContract;
  }

  public static deserialize(lightningTransactionObj: LightningTransaction): LightningTransaction {
      const fundingAddress = lightningTransactionObj["fundingAddress"];
      const transactionAmount = lightningTransactionObj["transactionAmount"];
      const otherDestination = lightningTransactionObj["otherDestination"];
      const otherValue = lightningTransactionObj["otherValue"];
      const selfDestination = lightningTransactionObj["selfDestination"];
      const selfValue = lightningTransactionObj["selfValue"];
      const smartContract = lightningTransactionObj["smartContract"];
      let lightningTransaction = new LightningTransaction(fundingAddress, transactionAmount, selfDestination, selfValue, otherDestination, otherValue, smartContract);
      return lightningTransaction;
    }
}