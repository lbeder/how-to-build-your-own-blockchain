import BigNumber from "bignumber.js";

export class BlockchainUtils {

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


}