import * as uuidv4 from 'uuid/v4';
import * as parseArgs from 'minimist';
import { Blockchain } from './Blockchain';
import { startWebServer } from './WebServer';

const ARGS = parseArgs(process.argv.slice(2));
const blockchain = new Blockchain(ARGS.id || uuidv4());
startWebServer(blockchain, ARGS.port || 3000);