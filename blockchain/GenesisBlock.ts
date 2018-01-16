import {Block} from './Block';

// Let's define that our "genesis" block as an empty block, starting from the January 1, 1970 (midnight "UTC").
export const GenesisBlock = new Block(0, [], 0, 0, "fiat lux");
