export class Request {
    params: any;
    body: string;
    method: 'put' | 'get' | 'post';
    url: string;
    reject: (reason?: any) => void;
    resolve: (resolve: any) => void;
    promise: Promise<{data: any, status: number}>;
    constructor({url, method, body}: {url: string, method: 'get' | 'put' | 'post', body: string }) {
        this.url = url;
        this.method = method;
        this.body = body;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    respond(data: any, status: number) {
        this.resolve({data, status});
    }
}
