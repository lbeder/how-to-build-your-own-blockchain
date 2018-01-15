import {Server} from "./shim/express";

export interface Resolver {
  resolve: (data: any) => {}
  reject: (err: Error) => {}
}

export class Peer {
  requests: Map<number, Resolver>;
  incomingRequests: Map<number, Array<string>>;
  peer: { send: (data: any) => {}; on: any; off: any };
  requestId: number;
  messageId: number;
  private static readonly REQUEST_TIMEOUT = 20000;
  private static readonly CHUNK_SIZE = 15000;

  constructor(peer: any) {
    this.requestId = 0;
    this.messageId = 0;
    this.peer = peer;
    this.requests = new Map<number, Resolver>();
    this.incomingRequests = new Map<number, Array<string>>();
  }

  fetch(url: string, message: any = undefined, method = 'get') {
    let encodedMessage = JSON.stringify({
      type: 'request',
      requestId: this.requestId,
      url,
      method,
      payload: message
    });

    // split the message into 16k chunks
    const numOfChunks = Math.ceil(encodedMessage.length / Peer.CHUNK_SIZE);
    for (let i = 0; i < numOfChunks; i++) {
      let chunkedMessages = {
        data: encodedMessage.slice(Peer.CHUNK_SIZE * i, Peer.CHUNK_SIZE * (i + 1)),
        messageId: this.messageId,
        seq: i,
        total: numOfChunks
      };
      this.peer.send(JSON.stringify(chunkedMessages));
    }
    this.messageId++;

    return new Promise((resolver, rejector) => {
      let done = false;
      const resolve = (data: any) => {
        if (done) return;
        done = true;
        resolver(data);
      };

      const reject = (err: Error) => {
        if (done) return;
        done = true;
        rejector(err);
      };

      setTimeout(reject, Peer.REQUEST_TIMEOUT, new Error('Request Timeout'));
      this.requests.set(this.requestId++, {resolve, reject} as Resolver);
    });
  }

  async processRequest(message: string, app: Server) {
    let {type, payload, url, requestId, method, status, data} = JSON.parse(message);
    if (type === 'request') {
      let {data, status} = await app.onRequest(url, method, payload);
      let responseMessage = JSON.stringify({
        type: 'response',
        requestId: requestId,
        data: data,
        status: status
      });

      // split the message into 16k chunks
      const numOfChunks = Math.ceil(responseMessage.length / Peer.CHUNK_SIZE);
      for (let i = 0; i < numOfChunks; i++) {
        let chunkedMessages = {
          data: responseMessage.slice(Peer.CHUNK_SIZE * i, Peer.CHUNK_SIZE * (i + 1)),
          messageId: this.messageId,
          seq: i,
          total: numOfChunks
        };
        this.peer.send(JSON.stringify(chunkedMessages));
      }
      this.messageId++;

    } else if (type === 'response') {
      let {resolve} = this.requests.get(requestId);
      this.requests.delete(requestId);
      resolve({data, status});
    }
  }

  listen(app: Server) {
    this.peer.on('channelMessage', async (peer: Peer, label: string, message: any) => {
      let {data, messageId, seq, total} = JSON.parse(message.type);
      if (!this.incomingRequests.has(messageId)) {
        let requestChunks = new Array(total).fill(false);
        this.incomingRequests.set(messageId, requestChunks);
      }
      let requestChunks = this.incomingRequests.get(messageId);
      requestChunks[seq] = data;
      if (requestChunks.some(chunk => !chunk)) {
        return;
      }
      const completeMessage = requestChunks.join('');
      this.processRequest(completeMessage, app);
    });
  }

}
