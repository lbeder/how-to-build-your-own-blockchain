import { Request } from './request';

export class Response {
    request: Request;
    constructor(request: Request) {
        this.request = request;
    }
    data: any;
    statusCode: number;
    status(code:number) {
        this.statusCode = code;
        setTimeout(() => this.end());
    }
    json(data: any) {
        this.data = data;
        setTimeout(() => this.end());
    }
    end() {
        this.request.respond(this.data, this.statusCode);
    }
}