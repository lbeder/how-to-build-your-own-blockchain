import {Server} from "./shim/express";

export interface Resolver {
  resolve: (data: any) => {}
  reject: (err: Error) => {}
}

export class Peer {
  requests: Map<number, Resolver>;
  peer: { send: (data: any) => {}; on: any; off: any };
  requestId: number;
  private static readonly REQUEST_TIMEOUT = 10000;

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
