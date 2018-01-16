import { Block } from './Block';
import * as fs from 'fs';
import { serialize, deserialize } from 'serializer.ts/Serializer';
import {Type} from "serializer.ts/Decorators";
import { GenesisBlock } from './GenesisBlock';
import { BlockchainVerifier } from './BlockchainVerifier';
const EC = require('elliptic').ec;


class PersistentData {
  @Type(() => Block)
  public blocks: Block[];
  public privateKey: string;

  constructor(blocks: Array<Block>, privateKey: string) {
    this.blocks = blocks;
    this.privateKey = privateKey;
  }
}

export class Persistency {
  private _storagePath: string;
  private _persistentData: PersistentData;

  constructor(storagePath: string) {
    this._storagePath = storagePath;

    try {
      this._persistentData = deserialize<PersistentData>(PersistentData, JSON.parse(fs.readFileSync(this._storagePath, "utf8")));
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }

      this._persistentData = new PersistentData([GenesisBlock], new EC('secp256k1').genKeyPair().getPrivate('hex'));
      this._save();
    } finally {
      BlockchainVerifier.verify(this.blocks);
    }
  }

  private _save() {
    fs.writeFileSync(this._storagePath, JSON.stringify(serialize(this._persistentData), undefined, 2), "utf8");
  }

  public saveBlocks(blocks: Array<Block>) {
    this._persistentData.blocks = blocks;
    this._save();
  }

  public get privateKey() {
    return this._persistentData.privateKey;
  }

  public get blocks() {
    return this._persistentData.blocks;
  }
}