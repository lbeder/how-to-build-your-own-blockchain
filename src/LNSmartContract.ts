export class LNSmartContract {
	 public submittedBlockchainHeight: number;
	 public blocksToWait: number;

	 constructor(submittedBlockchainHeight: number, blocksToWait: number) {
	 	this.submittedBlockchainHeight = submittedBlockchainHeight;
	 	this.blocksToWait = blocksToWait;
	 }

	 public isConditionSatisfied(blockchainHeight: number): boolean {
	 	return this.submittedBlockchainHeight + this.blocksToWait >= blockchainHeight;
	 }
}