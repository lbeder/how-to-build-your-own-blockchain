import {Server} from './shim/express';
import {Peer} from './peer';

const SimpleWebRTC = require('simplewebrtc');

export class SimpleNode {
  public peers: { [key: string]: any };

  constructor(app: Server) {
    const webrtc = new SimpleWebRTC({});
    this.peers = {};

    webrtc.createRoom('my-block-chain');

    webrtc.on('connectionReady', () => {
      console.log('SimpleWebRTC Ready');
      webrtc.joinRoom('my-block-chain');
      webrtc.on('createdPeer', (rawPeer: any) => {
        const dataChannel = rawPeer.getDataChannel('webcoin');

        dataChannel.onopen = () => {
          console.log('Peer connected', rawPeer.id);
          const abstractedPeer = {
            send: function sendWrapper(...args: any[]) {
              return dataChannel.send(...args);
            },
            on: rawPeer.on.bind(rawPeer),
            off: rawPeer.off.bind(rawPeer)
          };

          const peer = new Peer(abstractedPeer);

          this.peers[rawPeer.id] = peer;
          peer.listen(app);
        };
      });
    });
  }
}
