import protocol from './protocol';

export class Request {
    reject: (reason?: any) => void;
    resolve: (value?: {} | PromiseLike<{}>) => void;
    promise: Promise<{}>;
    content: any;
    peer: any;
    constructor(peer, content) {
        this.peer = peer;
        this.content = content;
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