import {Server} from './shim/express';
import {Peer} from './peer';

const SimpleWebRTC = require('simplewebrtc');

export class SimpleNode {
  public peers: { [peerId: string]: Peer };

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

    webrtc.on('createdPeer', (rawPeer: any) => {
      rawPeer.on('channelOpen', () => {
        console.log('data channel open')
      });
      rawPeer.getDataChannel('label');
      console.log('Peer connected', rawPeer.id);
      rawPeer.pc.on('iceConnectionStateChange', () => {
        const state = rawPeer.pc.iceConnectionState;
        if (state === 'closed') {
          delete this.peers[rawPeer.id];
        }
      });
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

    const roomName = 'my-block-chain-15';
    webrtc.on('connectionReady', () => {
      console.log('SimpleWebRTC Ready');
      webrtc.joinRoom(roomName, (err: any, res: any) => {
        console.log('joinRoom', err, res);
      });

    });
  }
}
