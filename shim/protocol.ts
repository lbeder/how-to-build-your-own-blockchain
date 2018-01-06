import Request from './request';

export default {
    encode(url, method, status, body) {
        return JSON.stringify({url, method, status, body});
    },
    decode(message): {url: string, method: string, body: string } {
        return JSON.parse(message);
    }
}