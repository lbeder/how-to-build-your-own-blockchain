import {deserialize} from "serializer.ts/Serializer";
import {Blockchain, MiningHandle} from './blockchain';
import {Block} from './block';
import {Transaction} from './transaction';
import {Peer} from './Peer';

export class NodeController {
  private blockchain: Blockchain;
  private peers: { [peerId: string]: Peer };
  private miningHandle: MiningHandle;
  private runningConsensus: Promise<void>;

  constructor(blockchain: Blockchain, peers: { [peerId: string]: Peer }) {
    this.blockchain = blockchain;
    this.peers = peers;
    this.miningHandle = null;
    this.runningConsensus = Promise.resolve();
    this.startMining();
    this.consensus()
      .catch(err => {
        console.error('Initial consensus failed', err);
      });
  }

  private startMining() {
    if (this.miningHandle) {
      const isTheSameTransactionsCount = this.miningHandle.transactionsCount === this.blockchain.transactionPool.length + 1;
      const didChainChange = this.miningHandle.lastBlock !== this.blockchain.getLastBlock().blockNumber;
      if (isTheSameTransactionsCount && !didChainChange) {
        // there hasn't been any change to the transactions - ignore call
        return;
      }
      else if (this.miningHandle.transactionsCount < Blockchain.MAX_BLOCK_SIZE) {
        // there is room for more transactions in the currently mined block - restart mining
        this.miningHandle.stop();
        this.miningHandle = null;
      }
      else if (!didChainChange) {
        // there is no more room for transactions in the currently mined block - exit
        return;
      }
      else {
        // chain changed - restart mining
        this.miningHandle.stop();
        this.miningHandle = null;
      }
    }

    this.miningHandle = this.blockchain.mineBlock();
    this.miningHandle.newBlockPromise
      .then(
        () => {
          // notify everyone about the new block
          this.miningHandle = null;
          this.notifyAll('/new-block');
          this.startMining();
        },
        err => {
          console.error('mining error', err);
          this.miningHandle = null;
          this.startMining();
        })
  }

  private notifyAll(route: string) {
    Promise.all(
      Object.values(this.peers)
        .map(node => node.fetch(route, null, 'post'))
    )
      .catch(err => {
        console.log('Some notifications failed', err);
      })
  };

  public async consensus() {
    if (!Object.keys(this.peers).length) return;

    const blockchainsResults = await Promise.all(Object.values(this.peers).map(node => node.fetch('/blocks')));

    const blockchains = blockchainsResults.map(({data}) => deserialize<Block[]>(Block, data));
    const success = this.blockchain.consensus(blockchains);

    if (success) {
      console.log(`Reached consensus from ${blockchainsResults.length} nodes`);
    }
    else {
      console.log(`Can't reach a consensus ${blockchainsResults.length}`);
    }

    this.startMining();
  }

  public getAllBlocks() {
    return this.blockchain.blocks;
  }

  public getBlock(blockId: string) {
    const id = Number(blockId);
    if (isNaN(id)) throw new Error('Invalid Block Id');

    if (id >= this.blockchain.blocks.length) throw new Error(`Block #${id} wasn't found`);

    return this.blockchain.blocks[id];
  }

  public getTransactions(): Array<Transaction> {
    return this.blockchain.transactionPool.slice();
  }

  public submitTransaction(senderAddress: string, recipientAddress: string, value: number) {
    if (!senderAddress || !recipientAddress || !value) throw new Error("Invalid parameters!");
    this.blockchain.submitTransaction(senderAddress, recipientAddress, value);
    this.startMining();
  }

  public handleNewBlockNotifications() {
    // chain consensus calls so we don't miss any but still only run one in parallel
    this.runningConsensus = this.runningConsensus.then(async () => {
      try {
        await this.consensus();
        this.startMining();
      }
      catch (err) {
        console.warn('Consensus failed', err);
      }
    })
  }
}
