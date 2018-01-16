import BigNumber from "bignumber.js";
import {BDChannel} from "./BDChannel";
import {NodeLightningTransactions} from "./NodeLightningTransactions";
import {LightningTransaction} from "./LightningTransaction";

export class Utils {

	public static isPoWValid(pow: string, target: string): boolean {
    try {
      if (!pow.startsWith("0x")) {
        pow = `0x${pow}`;
      }

      return new BigNumber(pow).lessThanOrEqualTo(target);
    } catch {
      return false;
    }
  }

  public static now(): number {
    return Math.round(new Date().getTime() / 1000);
  }

  public static mapToObj(map: Map<string, any>): Object {
    let obj = Object.create(null);
    for (let [k,v] of map) {
        obj[k] = v;
    }
    return obj;
  }

  public static mapToChannelsObj(map: Map<string, any>): Object {
    let obj = Object.create(null);
    for (let [k,v] of map) { 
        v.balances = this.mapToObj(v.balances);
        obj[k] = v;    
    }
    return obj;
  }

  public static mapToNodeLightningTransactionsObj(map: Map<string, any>): Object {
    let obj = Object.create(null);
    for (let [k,v] of map) { 
        v.lightningTransactions = this.mapToObj(v.lightningTransactions);
        obj[k] = v;    
    }
    return obj;
  }

  public static deserializeChannelMap(obj: Object): Map<string, BDChannel> {
    let map = new Map<string, BDChannel>();
    for (let k of Object.keys(obj)) {
        let bdChannel = BDChannel.deserialize((<any>obj)[k]);
        map.set(k, bdChannel);
    }
    return map;
  }

  public static deserializeNodeLightningTransactionsMap(obj: Object): Map<string, NodeLightningTransactions> {
    let map = new Map<string, NodeLightningTransactions>();
    for (let k of Object.keys(obj)) {
        let nodeLightningTransactions = NodeLightningTransactions.deserialize((<any>obj)[k]);
        map.set(k, nodeLightningTransactions);
    }
    return map;
  }

  public static deserializeLightningTransactionsMap(obj: Object): Map<string, LightningTransaction> {
    let map = new Map<string, LightningTransaction>();
    for (let k of Object.keys(obj)) {
        let lightningTransaction = LightningTransaction.deserialize((<any>obj)[k]);
        map.set(k, lightningTransaction);
    }
    return map;
  }

  public static deserializeNumberMap(obj: Object): Map<string, number> {
    let map = new Map<string, number>();
    for (let k of Object.keys(obj)) {
        let val = ((<any>obj)[k]);
        map.set(k, val);
    }
    return map;
  }

  public static cloneChannelMap(map: Map<string, BDChannel>): Map<string, BDChannel> {
    let newMap = new Map<string, BDChannel>();
    for (let k of map.keys()) {
        let bdChannel = map.get(k);
        let clonedBDChannel = new BDChannel(bdChannel.multiSigAddress, bdChannel.nodeId1, bdChannel.fundingTx1, bdChannel.nodeId2, bdChannel.fundingTx2, bdChannel.balances);
        clonedBDChannel.isSigned = bdChannel.isSigned;
        newMap.set(k, clonedBDChannel);
    }
    return newMap;
  }

  public static cloneLightningTransactions(map: Map<string, LightningTransaction>): Map<string, LightningTransaction> {
    let newMap = new Map<string, LightningTransaction>();
    for (let k of map.keys()) {
        let lightningTransaction = map.get(k);
        let clonedLightningTransaction = new LightningTransaction(lightningTransaction.fundingAddress, lightningTransaction.transactionAmount, lightningTransaction.otherDestination, lightningTransaction.otherValue, lightningTransaction.selfDestination, lightningTransaction.selfValue, lightningTransaction.smartContract);
        newMap.set(k, clonedLightningTransaction);
    }
    return newMap;
  }

  public static cloneNodeLightningTransactionMap(map: Map<string, NodeLightningTransactions>): Map<string, NodeLightningTransactions> {
    let newMap = new Map<string, NodeLightningTransactions>();
    for (let k of map.keys()) {
        let nodeLightningTransactions = map.get(k);
        let lightningTransactions = nodeLightningTransactions.lightningTransactions;
        let clonedLightningTransactions = this.cloneLightningTransactions(lightningTransactions);
        let clonedNodeLightningTransactions = new NodeLightningTransactions(clonedLightningTransactions);
        newMap.set(k, clonedNodeLightningTransactions);
    }
    return newMap;
  }

}