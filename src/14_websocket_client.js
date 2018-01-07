const ARGS = require('minimist')(process.argv.slice(2));
const URL = ARGS.url || 'ws://localhost';
const PORT = ARGS.port || 3000;

const WebSocket = require('ws');
const ws = new WebSocket(`${URL}:${PORT}`);

console.log(`Client connected to server on ${URL}:${PORT}`);

ws.on('open', function open() {
    console.log('Sending the command "mine" to server. Response will be received asynchronously');
    ws.send('mine');

    ws.on('message', function incoming(data) {
        console.log(`Received data from server: ${data}`);
        ws.close();
        console.log('Closed connection on client side');
    })

});
