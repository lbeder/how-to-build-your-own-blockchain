import SimpleWebRTC from 'simplewebrtc';
import express from './shim/express';
import encoder from 'encoder';

let webrtc = new SimpleWebRTC({});
let peers = {};
let requests = {};
window.peerIds = [];

webrtc.on('readyToCall', () => {
    webrtc.joinRoom('my-block-chain');
    webrtc.on('createdPeer', (peer) => {
        peers[peer.id] = peer;
        window.peers.push(peer.id);
        peer.on('message', async (message) => {
            let decodedMessage = encoder.decode(message);
            if (decodedMessage.type === 'request') {
                let {data, status} = express.onRequest(decodedMessage.url, decodedMessage.payload);
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

let requestId = 0;

function fetch(peerId, url, message) {
    let peer = peers[peerId];
    let encodedMessage = encoder.encode({type: 'request', requestId: requestId++, url: url, message: message});
    peer.send(encodedMessage);
    return new Promise((resolve, reject) => {
        requests[requestId] = {resolve: resolve, reject: reject};
    });
}

module.exports = fetch;






