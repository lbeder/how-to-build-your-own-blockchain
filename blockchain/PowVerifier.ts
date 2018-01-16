import BigNumber from "bignumber.js";

const DIFFICULTY = 4;
const TARGET = 2 ** (256 - DIFFICULTY);

// Validates PoW.
export class PowVerifier {
  public static isPoWValid(pow: string): boolean {
    try {
      if (!pow.startsWith("0x")) {
        pow = `0x${pow}`;
      }

      return new BigNumber(pow).lessThanOrEqualTo(TARGET.toString());
    } catch {
      return false;
    }
  }
}