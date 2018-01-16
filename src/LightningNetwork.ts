import {Blockchain} from "./Blockchain";
import {BDChannel} from "./BDChannel";
import {Address} from "./Address";
import {Node} from "./Node";
import {Transaction} from "./Transaction";
import {LightningTransaction} from "./LightningTransaction";
import {LNSmartContract} from "./LNSmartContract";
import {Utils} from "./Utils";
import {NodeLightningTransactions} from "./NodeLightningTransactions";
import { serialize, deserialize } from "serializer.ts/Serializer";

import * as fs from "fs";
import * as path from "path";

export class LightningNetwork {

	public static readonly SMART_CONTRACT_BLOCKS_TO_WAIT = 10;
	
	public blockchain: Blockchain;
	public candidateChannels: Map<string, BDChannel>;
	public activeChannels: Map<string, BDChannel>;
	public nodeLightningTransactions: Map<string, NodeLightningTransactions>;
	private candidateStoragePath: string;
	private activeStoragePath: string;
	private transactionStoragePath: string;
	

	constructor(blockchain: Blockchain) {
		this.candidateStoragePath = path.resolve(__dirname, "../", `candidateChannels.lightning`);
		this.activeStoragePath = path.resolve(__dirname, "../", `activeChannels.lightning`);
		this.transactionStoragePath = path.resolve(__dirname, "../", `lightningTransactions.lightning`);

		this.blockchain = blockchain;

	}

	public openCandidateChannel(address: string, nodeId: string, sendingAddress: string, fundingTxValue: number): BDChannel {
		this.loadNetworkState();

		if (this.activeChannels.get(address)) {
			throw new Error("This address is already in use");
		}

		const multiAddress = new Address(address);
		const fundingTx = new Transaction(new Address(sendingAddress), multiAddress, fundingTxValue);
		
		let candidateChannel = this.candidateChannels.get(address);
		if (!candidateChannel) {
			let balances = new Map<string, number>();
			balances.set(nodeId, fundingTx.value);
			candidateChannel = new BDChannel(multiAddress, nodeId, fundingTx, undefined, undefined, balances);
			this.candidateChannels.set(address, candidateChannel);
		}
		else if (candidateChannel.isSigned) {
			throw new Error("Cannot open the channel. Channel is already signed");
		}
		else {
			candidateChannel.signChannel(nodeId, fundingTx);
			
			this.activeChannels.set(address, candidateChannel);
			this.candidateChannels.delete(address);

			this.submitFundingTransactions(candidateChannel, nodeId);
		}

		this.saveNetworkState();
		return candidateChannel;
	}

	public submitLightningTransaction(nodeId: string, channelAddress: string, senderAddress: string, destinationAddress: string, value: number){
		this.loadNetworkState();

		let activeChannel = this.activeChannels.get(channelAddress);

		if (!activeChannel) {
			throw new Error("Funding channel address is not an active channel");
		}

		const isTransactionValid = this.validateTransaction(activeChannel, nodeId, value);
		if (!isTransactionValid) {
			throw new Error("Transaction is invalid (not enough balance)");
		}

		const channelFunding = activeChannel.getFunding();
		const otherNodeId = activeChannel.getOtherNodeId(nodeId);

		const selfAmount = activeChannel.balances.get(nodeId) - value;
		const otherAmount = activeChannel.balances.get(otherNodeId) + value;

		let otherLightningTransaction = this.createLightningTransaction(channelAddress, channelFunding, senderAddress, selfAmount, destinationAddress, otherAmount);
		let selfLightningTransaction = this.createLightningTransaction(channelAddress, channelFunding, destinationAddress, otherAmount, senderAddress, selfAmount);

		let otherLightningTransactions = this.nodeLightningTransactions.get(otherNodeId);
		if (!otherLightningTransactions) {
			otherLightningTransactions = this.createNewNodeLightningTransactions(otherLightningTransaction, channelAddress);
		}
		else {
			otherLightningTransactions.addLightningTransaction(channelAddress, otherLightningTransaction);
		}
		this.nodeLightningTransactions.set(otherNodeId, otherLightningTransactions);

		let selfLightningTransactions = this.nodeLightningTransactions.get(nodeId);
		if (!selfLightningTransactions) {
			selfLightningTransactions = this.createNewNodeLightningTransactions(selfLightningTransaction, channelAddress);
		}
		else {
			selfLightningTransactions.addLightningTransaction(channelAddress, selfLightningTransaction);
		}
		this.nodeLightningTransactions.set(nodeId, selfLightningTransactions);

		this.updateChannel(activeChannel, nodeId, otherNodeId, value);

		this.saveNetworkState();

		return selfLightningTransaction;
	}

	public broadcastChannelTransaction(nodeId: string, channelAddress: string) {
		this.loadNetworkState();

		let nodeLightningTransactions = this.nodeLightningTransactions.get(nodeId);
		if (!nodeLightningTransactions) {
			throw new Error("No lightning transactions for the given nodeId");
		}
		let channelTransaction = nodeLightningTransactions.lightningTransactions.get(channelAddress);
		this.broadcast(channelTransaction, nodeId);

		const activeChannel = this.activeChannels.get(channelAddress);
		const otherNodeId = activeChannel.getOtherNodeId(nodeId);

		this.activeChannels.delete(channelAddress);
		nodeLightningTransactions.lightningTransactions.delete(channelAddress);
		if (nodeLightningTransactions.lightningTransactions.size == 0) {
			this.nodeLightningTransactions.delete(nodeId);
		}

		let otherNodeLightningTransactions = this.nodeLightningTransactions.get(otherNodeId);
		otherNodeLightningTransactions.lightningTransactions.delete(channelAddress);
		if (otherNodeLightningTransactions.lightningTransactions.size == 0) {
			this.nodeLightningTransactions.delete(otherNodeId);
		}

		this.saveNetworkState();
	}

	private validateTransaction(activeChannel: BDChannel, nodeId: string, value: number): boolean {
		if (value > activeChannel.getFunding()) {
			return false;
		}
		if (value > activeChannel.balances.get(nodeId)) {
			return false;
		}
		return true;
	}

	private createNewNodeLightningTransactions(lightningTransaction: LightningTransaction, channelAddress: string): NodeLightningTransactions{
		let transactionMap = new Map<string, LightningTransaction>();
		transactionMap.set(channelAddress, lightningTransaction);
		let nodeLightningTransactions = new NodeLightningTransactions(transactionMap);
		return nodeLightningTransactions;
	}

	private createLightningTransaction(channelAddress: string, transactionAmount: number, senderAddress: string, value: number, destinationAddress: string, otherValue: number) {
		let smartContract = new LNSmartContract(this.blockchain.getHeight(), LightningNetwork.SMART_CONTRACT_BLOCKS_TO_WAIT);
		return new LightningTransaction(channelAddress, transactionAmount, senderAddress, value, destinationAddress, otherValue, smartContract);
	}

	private updateChannel(activeChannel: BDChannel, nodeId: string, otherNodeId: string, value: number) {
		let selfBalance = activeChannel.balances.get(nodeId);
		let otherBalance = activeChannel.balances.get(otherNodeId);

		selfBalance -= value;
		otherBalance += value;

		activeChannel.balances.set(nodeId, selfBalance);
		activeChannel.balances.set(otherNodeId, otherBalance);

		this.activeChannels.set(activeChannel.multiSigAddress.id, activeChannel);
	}

	private submitFundingTransactions(bdChannel: BDChannel, nodeId: string) {
		this.blockchain.submitTransaction(bdChannel.fundingTx1.senderAddress, bdChannel.multiSigAddress, bdChannel.fundingTx1.value);
  		this.blockchain.submitTransaction(bdChannel.fundingTx2.senderAddress, bdChannel.multiSigAddress, bdChannel.fundingTx2.value);
  		this.saveBlockchain(nodeId);
	}

	private broadcast(lightningTransaction: LightningTransaction, nodeId: string) {
		this.blockchain.submitTransaction(new Address(lightningTransaction.fundingAddress), new Address(lightningTransaction.otherDestination), lightningTransaction.otherValue);

		let smartContract = lightningTransaction.smartContract;
		let selfTransaction = new Transaction(new Address(lightningTransaction.fundingAddress), new Address(lightningTransaction.selfDestination), lightningTransaction.selfValue);
		selfTransaction.setSmartContract(smartContract);
		this.blockchain.submitSmartContractTransaction(selfTransaction);

		this.saveBlockchain(nodeId);
	}

	private saveNetworkState() {
		let clonedCandidateChannels = Utils.cloneChannelMap(this.candidateChannels);
    	fs.writeFileSync(this.candidateStoragePath, JSON.stringify(Utils.mapToChannelsObj(clonedCandidateChannels)));
    	let clonedActiveChannels = Utils.cloneChannelMap(this.activeChannels);
    	fs.writeFileSync(this.activeStoragePath, JSON.stringify(Utils.mapToChannelsObj(clonedActiveChannels)));
    	let clonedNodeLightningTransactions = Utils.cloneNodeLightningTransactionMap(this.nodeLightningTransactions);
    	fs.writeFileSync(this.transactionStoragePath, JSON.stringify(Utils.mapToNodeLightningTransactionsObj(this.nodeLightningTransactions)));
  	}

  	private loadNetworkState() {
    try {
      this.candidateChannels = Utils.deserializeChannelMap(JSON.parse(fs.readFileSync(this.candidateStoragePath, "utf8")));
      this.activeChannels = Utils.deserializeChannelMap(JSON.parse(fs.readFileSync(this.activeStoragePath, "utf8")));
      this.nodeLightningTransactions = Utils.deserializeNodeLightningTransactionsMap(JSON.parse(fs.readFileSync(this.transactionStoragePath, "utf8")));
      
    } catch (err) {
      	if (err.code !== "ENOENT") {
        	throw err;
      	}

      	this.candidateChannels = new Map<string, BDChannel>();
      	this.activeChannels = new Map<string, BDChannel>();
      	this.nodeLightningTransactions = new Map<string, NodeLightningTransactions>();
 	}
   }

   private saveBlockchain(nodeId: string) {
   	const blockchainStoragePath = path.resolve(__dirname, "../", `${nodeId}.blockchain`);
    fs.writeFileSync(blockchainStoragePath, JSON.stringify(serialize(this.blockchain.blocks), undefined, 2), "utf8");
  }

}