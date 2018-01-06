import {Server} from './shim/express';
import {Peer} from './peer';

const SimpleWebRTC = require('simplewebrtc');

export class SimpleNode {
  public peers: { [key: string]: any };

  constructor(app: Server) {
    const webrtc = new SimpleWebRTC({    // we don't do video
      localVideoEl: '',
      remoteVideosEl: '',
      // dont ask for camera access
      autoRequestMedia: false,
      // dont negotiate media
      receiveMedia: {
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      }
    });
    this.peers = {};

    webrtc.createRoom('my-block-chain-bla-bla');

    webrtc.on('connectionReady', () => {
      console.log('SimpleWebRTC Ready');
      webrtc.joinRoom('my-block-chain');
      webrtc.on('createdPeer', (rawPeer: any) => {
        console.log('Peer connected', rawPeer.id);
        const abstractedPeer = {
          send: (message: any) => {
            rawPeer.sendDirectly.apply(rawPeer, ['label', message]);
          },
          on: rawPeer.on.bind(rawPeer),
          off: rawPeer.off.bind(rawPeer)
        };

        const peer = new Peer(abstractedPeer);

        this.peers[rawPeer.id] = peer;
        peer.listen(app);
      });
    });
  }
}
