import {Server} from "./shim/express";

export interface Resolver {
  resolve: (data: any) => {}
  reject: (err: Error) => {}
}

export class Peer {
  requests: Map<number, Resolver>;
  peer: { send: (data: any) => {}; on: any; off: any };
  requestId: number;

  constructor(peer: any) {
    this.requestId = 0;
    this.peer = peer;
    this.requests = new Map<number, Resolver>();
  }

  fetch(url: string, message: any = undefined, method = 'get') {
    let encodedMessage = JSON.stringify({
      type: 'request',
      requestId: this.requestId,
      url,
      method,
      payload: message
    });
    this.peer.send(encodedMessage);
    return new Promise((resolve, reject) => {
      this.requests.set(this.requestId++, {resolve, reject} as Resolver);
    });
  }

  listen(app: Server) {
    this.peer.on('channelMessage', async (peer: Peer, label: string, message: any) => {
      let {type, payload, requestId, url, method, status, data} = JSON.parse(message.type);
      if (type === 'request') {
        let {data, status} = await app.onRequest(url, method, payload);
        let responseMessage = JSON.stringify({
          type: 'response',
          requestId: requestId,
          data: data,
          status: status
        });
        this.peer.send(responseMessage);
      } else if (type === 'response') {
        let {resolve} = this.requests.get(requestId);
        this.requests.delete(requestId);
        resolve({data, status});
      }
    });
  }

}
