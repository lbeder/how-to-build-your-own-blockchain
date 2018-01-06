import SimpleWebRTC from 'simplewebrtc';
import encoder from './shim/protocol';
import { Server } from './shim/express';
import { Peer } from './peer';
export class SimpleNode {
  public peers: {[key: string]: any};

  constructor(app: Server) {
    const webrtc = new SimpleWebRTC({});
    this.peers = { };
    const requests: {[key: string]: {resolve: any, reject: any }} = {};
    let requestId = 0;

    webrtc.on('readyToCall', () => {
      webrtc.joinRoom('my-block-chain');
      webrtc.on('createdPeer', (peer: any) => {
        this.peers[peer.id] = new Peer(peer);
        peer.listen(app);
      });
    });
  }
}
