import {deserialize, serialize} from "serializer.ts/Serializer";
import {EventEmitter} from 'Eventemitter3';
import {Blockchain, MiningHandle} from './blockchain';
import {Block} from './block';
import {Transaction} from './transaction';
import {Peer} from './Peer';

export class NodeController extends EventEmitter {
  private blockchain: Blockchain;
  private peers: { [peerId: string]: Peer };
  private miningHandle: MiningHandle;
  private runningConsensus: Promise<void>;
  public config: {
    autoMining: boolean,
    autoConsensus: boolean
  };

  constructor(peers: { [peerId: string]: Peer }) {
    super();
    this.peers = peers;
    this.miningHandle = null;
    this.runningConsensus = Promise.resolve();
  }

  private startMining(force?:boolean) {
    if (!force && !this.config.autoMining) return;
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
    this.miningHandle.progressEmitter.on('progress', ({pendingBlock}) => {
      this.emit('liveState', {
        pendingBlock: deserialize(Block, serialize(pendingBlock))
      });
    });
    this.miningHandle.newBlockPromise
      .then(
        newBlock => {
          // notify everyone about the new block
          this.miningHandle = null;
          this.emit('liveState', {
            pendingBlock: null
          });
          this.emit('newBlock');
          this.emit('activity', {
            msg: `Mined new block #${newBlock.blockNumber} - ${newBlock.sha256().slice(0, 10)}`
          });
          this.notifyAll('/new-block');
          this.startMining();
        },
        err => {
          console.error('mining error', err);
          this.miningHandle = null;
          this.startMining();
        });

    this.emit('liveState', {
      isMining: true
    });
  }

  stopMining() {
    if (this.miningHandle) {
      this.miningHandle.stop();
      this.miningHandle = null;
    }
    this.emit('liveState', {
      isMining: false
    });
  }

  private notifyAll(route: string, payload: any = null) {
    this.emit('activity', {msg: `Notifying all peers ${route}`});
    Promise.all(
      Object.values(this.peers)
        .map(node => node.fetch(route, payload, 'post'))
    )
      .catch(err => {
        console.log('Some notifications failed', err);
      });
  };


  public init({miningAddress = '', autoMining = true, autoConsensus = true} = {miningAddress: ''}) {
    if (!miningAddress) throw new Error('Must provide mining address');

    this.emit('activity', {msg: `Initialize Blockchain`});

    this.config = {autoMining, autoConsensus};
    this.blockchain = new Blockchain(miningAddress);

    this.startMining();
    this.consensus()
      .catch(err => {
        console.error('Initial consensus failed', err);
      });
    this.emit('liveState', {
      statue: 'running'
    });
    this.emit('init');
  }

  public async consensus(force?:boolean) {
    if (!force && !this.config.autoConsensus) return;

    if (!Object.keys(this.peers).length || !this.blockchain) return;

    const blockchainsResults = await Promise.all(Object.values(this.peers).map(node => node.fetch('/blocks')));

    const blockchains = blockchainsResults.map(({data}) => deserialize<Block[]>(Block, data));
    const success = this.blockchain.consensus(blockchains);

    if (success) {
      console.log(`Reached consensus from ${blockchainsResults.length} nodes`);
      this.emit('activity', {msg: `Reached consensus from ${blockchainsResults.length} nodes`});
    }
    else {
      console.log(`Can't reach a consensus ${blockchainsResults.length}`);
      this.emit('activity', {msg: `Can't reach a consensus ${blockchainsResults.length}`});
    }

    this.startMining();
  }

  public getAllBlocks() {
    if (!this.blockchain) return [];
    return this.blockchain.blocks;
  }

  public getBlock(blockId: string) {
    const id = Number(blockId);
    if (isNaN(id)) throw new Error('Invalid Block Id');

    if (!this.blockchain || id >= this.blockchain.blocks.length) throw new Error(`Block #${id} wasn't found`);

    return this.blockchain.blocks[id];
  }

  public getTransactions(): Array<Transaction> {
    if (!this.blockchain) return [];
    return this.blockchain.transactionPool.slice();
  }

  public submitTransaction(transaction: Transaction) {
    this.blockchain.submitTransaction(transaction);
    this.emit('activity', {msg: `Transaction submitted ${JSON.stringify(serialize(transaction))}`});
    this.startMining();
  }

  public createTransaction(transaction: Transaction) {
    if (!this.blockchain) throw new Error('Block chain is not initialized');
    this.submitTransaction(transaction);

    this.notifyAll('/transactions', serialize(transaction));
  }

  public handleNewBlockNotifications() {
    // chain consensus calls so we don't miss any but still only run one in parallel
    this.runningConsensus = this.runningConsensus.then(async () => {
      try {
        await this.consensus();
        this.startMining();
        this.emit('activity', {
          msg: `Peer reported new block`
        });
        this.emit('newBlock');
      }
      catch (err) {
        console.warn('Consensus failed', err);
      }
    })
  }

  handleNewPeerNotification() {
    this.emit('liveState', {
      peers: Object.keys(this.peers).length
    });
    this.handleNewBlockNotifications();
  }
}
