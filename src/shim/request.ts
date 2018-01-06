import protocol from './protocol';

export class Request {  
    params: any;
    body: string;
    method: string;
    url: string;
    reject: (reason?: any) => void;
    resolve: (value?: {} | PromiseLike<{}>) => void;
    promise: Promise<{}>;
    peer: any;
    constructor(peer, {url, method, body}: {url: string, method: string, body: string }) {
        this.peer = peer;
        this.url = url;
        this.method = method;
        this.body = body;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    respond(data: any, status: number) {
        this.resolve(JSON.stringify({
            data, 
            status
        }));
    }
}