import {Server} from './shim/express';
import {Peer} from './peer';

const SimpleWebRTC = require('simplewebrtc');

export class SimpleNode {
  public peers: { [peerId: string]: Peer };

  constructor(app: Server, onPeerConnected: () => void) {
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
      // const isInitiator = rawPeer.pc.pc.localDescription.type === 'offer';
      // console.log("peer id", isInitiator, rawPeer.pc.pc.localDescription);
      let calledNewPeer = false;
      rawPeer.on('channelOpen', (channel: any) => {
        if (channel.label === 'simplewebrtc') return;
        console.log(`Data channel [${channel.label}] opened with ${rawPeer.id}`);
        if (!calledNewPeer) {
          calledNewPeer = true;
          // delay peer announcement to allow data channel negotiation
          setTimeout(() => onPeerConnected(), 500);
        }
      });

      if (webrtc.connection.getSessionid() > rawPeer.id) {
        console.log('Initiating Data channel to', rawPeer.id);
        rawPeer.getDataChannel('webcoin-channel');
      }

      console.log('Peer connected', rawPeer.id);
      rawPeer.pc.on('iceConnectionStateChange', () => {
        const state = rawPeer.pc.iceConnectionState;
        if (state === 'closed') {
          delete this.peers[rawPeer.id];
        }
      });
      const abstractedPeer = {
        send: (message: any) => {
          rawPeer.sendDirectly.apply(rawPeer, ['webcoin-channel', message]);
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
        if (err) console.error('joinRoom', err);
      });
    });
  }
}
