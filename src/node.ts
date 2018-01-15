import { Account } from "./accounts";

export class Node {
  public id: string;
  public url: URL;
  public accounts: Array<any>;

  constructor(id: string, url: URL) {
    this.id = id;
    this.url = url;
    this.accounts = [];
  }

  public toString(): string {
    return `${this.id}:${this.url}`;
  }
}
