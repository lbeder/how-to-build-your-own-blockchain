import {Address} from "./Address";
import {LightningTransaction} from "./LightningTransaction";
import {Utils} from "./Utils";

export class NodeLightningTransactions {
	 public lightningTransactions: Map<string, LightningTransaction>;

	 constructor(lightningTransactions: Map<string, LightningTransaction>) {
	 	this.lightningTransactions = lightningTransactions;
	 }

	 public static deserialize(nodeLightningTransactionsObj: NodeLightningTransactions): NodeLightningTransactions {
	    let lightningTransactions = nodeLightningTransactionsObj["lightningTransactions"];
	    lightningTransactions = Utils.deserializeLightningTransactionsMap(lightningTransactions);
	    
	    let nodeLightningTransactions = new NodeLightningTransactions(lightningTransactions);
	    return nodeLightningTransactions;
  	}

	 public addLightningTransaction(address: string, lightningTransaction: LightningTransaction) {
	 	this.lightningTransactions.set(address, lightningTransaction);
	 }

}