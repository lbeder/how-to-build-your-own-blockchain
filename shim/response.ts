export class Response {
    peer: any;
    constructor(peer: any) {
        this.peer = peer;
    }
    data: any;
    statusCode: number;
    status(code:number) {
        this.statusCode = code;
    }
    json(data: any) {
        this.data = data;
    }
    end() {

    }
}