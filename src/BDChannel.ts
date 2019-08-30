import {Address} from "./Address";
import {Transaction} from "./Transaction";
import {Utils} from "./Utils";

export class BDChannel {
	public multiSigAddress : Address;
	public nodeId1 : string;
	public fundingTx1 : Transaction;
	public nodeId2 : string;
	public fundingTx2 : Transaction;
	public balances : Map<string, number>;
	public isSigned : boolean = false;

	constructor(multiSigAddress: Address, nodeId1: string, fundingTx1: Transaction, nodeId2: string, fundingTx2: Transaction, balances: Map<string, number>) {
		this.multiSigAddress = multiSigAddress;
		this.nodeId1 = nodeId1;
		this.fundingTx1 = fundingTx1;
		this.nodeId2 = nodeId2;
		this.fundingTx2 = fundingTx2;
		this.balances = balances;
	}

	public static deserialize(bdChannelObj: BDChannel): BDChannel {
	    const multiSigAddress = bdChannelObj["multiSigAddress"];
	    const nodeId1 = bdChannelObj["nodeId1"];
	    const fundingTx1 = bdChannelObj["fundingTx1"];
	    const nodeId2 = bdChannelObj["nodeId2"];
	    const fundingTx2 = bdChannelObj["fundingTx2"];
	    const balancesObj = bdChannelObj["balances"];
		const balances = Utils.deserializeNumberMap(balancesObj);
	    const isSigned = bdChannelObj["isSigned"];
	    let bdChannel = new BDChannel(multiSigAddress, nodeId1, fundingTx1, nodeId2, fundingTx2, balances);
	    bdChannel.isSigned = isSigned;
	    return bdChannel;
  	}

	public signChannel(nodeId2: string, fundingTx2: Transaction) {

		if (this.nodeId1 === nodeId2) {
			throw new Error("${nodeId} is already in the channel");
		}
		
		this.nodeId2 = nodeId2;
		this.fundingTx2 = fundingTx2;
		this.isSigned = true;
		this.updateBalances(this.nodeId1, this.fundingTx1.value, this.nodeId2, this.fundingTx2.value);
	}

	public getFunding(): number {
		return this.balances.get(this.nodeId1) + this.balances.get(this.nodeId2);
	}

	public getOtherNodeId(nodeId: string): string {
		if (this.nodeId1 === nodeId) {
			return this.nodeId2;
		}
		return this.nodeId1;
	}

	public updateBalances(nodeId1: string, value1: number, nodeId2: string, value2: number) {
		if (!this.balances) {
			this.balances = new Map<string, number>();
		}
		this.balances.set(nodeId1, value1);
		this.balances.set(nodeId2, value2);	
	}
}