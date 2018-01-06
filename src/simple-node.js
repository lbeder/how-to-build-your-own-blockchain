import SimpleWebRTC from 'simplewebrtc';
import express from './shim/express';
import encoder from 'encoder';

let webrtc = new SimpleWebRTC({});
let peers = {};
window.peerIds = [];

webrtc.on('readyToCall', () => {
    webrtc.joinRoom('my-block-chain');
    webrtc.on('createdPeer', (peer) => {
        peers[peer.id] = peer;
        window.peers.push(peer.id);
        peer.on('message', async (message) => {
            let decodedMessage = encoder.decode(message);
            let {data, status} = router.onRequest({content: decodedMessage});
            let responseMessage = encoder.encode({type: response, data: data, status: status});
            peer.send(responseMessage);
        });
    });
});

function fetch(peerId, url, message) {
    let peer = peers[peerId];
    let encodedMessage = encoder.encode({type: request, url: url, message: message});
    peer.send(encodedMessage);
}

module.exports = fetch;






