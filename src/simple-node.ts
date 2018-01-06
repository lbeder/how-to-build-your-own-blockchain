import {Server} from './shim/express';
import {Peer} from './peer';
const SimpleWebRTC = require('simplewebrtc');

export class SimpleNode {
  public peers: { [key: string]: any };

  constructor(app: Server) {
    const webrtc = new SimpleWebRTC({});
    this.peers = {};

    webrtc.on('readyToCall', () => {
      webrtc.joinRoom('my-block-chain');
      webrtc.on('createdPeer', (peer: any) => {
        const dataChannel = peer.getDataChannel('webcoin');

        this.peers[peer.id] = new Peer({
          ...peer,
          send: function sendWrapper(...args: any[]) {
            return dataChannel.send(...args);
          }
        });
        peer.listen(app);
      });
    });
  }
}
