import SimpleWebRTC from 'simplewebrtc';
import encoder from './shim/protocol';

export class SimpleNode {
  public peers: {};

  constructor(app) {
    const webrtc = new SimpleWebRTC({});
    this.peers = {};
    const requests = {};
    let requestId = 0;

    webrtc.on('readyToCall', () => {
      webrtc.joinRoom('my-block-chain');
      webrtc.on('createdPeer', (peer) => {
        this.peers[peer.id] = peer;

        peer.fetch = function fetch(peerId, url, message) {
          let peer = this.peers[peerId];
          let encodedMessage = encoder.encode({type: 'request', requestId: requestId++, url: url, message: message});
          peer.send(encodedMessage);
          return new Promise((resolve, reject) => {
            requests[requestId] = {resolve: resolve, reject: reject};
          });
        };

        window.peers.push(peer.id);
        peer.on('message', async (message) => {
          let decodedMessage = encoder.decode(message);
          if (decodedMessage.type === 'request') {
            let {data, status} = app.onRequest(decodedMessage.url, decodedMessage.payload);
            let responseMessage = encoder.encode({
              type: 'response',
              requestId: requestId,
              data: data,
              status: status
            });
            peer.send(responseMessage);
          } else if (decodedMessage.type === 'response') {
            let request = requests[requestId];
            request.resolve({data: decodedMessage.data, status: decodedMessage.status});
          }
        });
      });
    });
  }
}
