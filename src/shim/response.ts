import { Request } from './request';

export class Response {
  ended: any;
  request: Request;
  constructor(request: Request) {
    this.request = request;
    this.ended = false;
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
    if (this.ended) {
      return;
    }
    this.ended = true;
    this.request.respond(this.data, this.statusCode);
    
  }
}