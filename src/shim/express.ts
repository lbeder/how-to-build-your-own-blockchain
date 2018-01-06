
import protocol from './protocol';
import Router from 'routes';
import { Response } from './response';
import { Request } from './request';

  // returns app
export class Server {
  handlers: { get: Router; post: Router; put: Router; };
  constructor() {
    this.handlers = {
      get: Router(),
      post: Router(),
      put: Router()
    };
  }
  get(path: string, fn: (route:string) => Promise<any>) {
    this.handlers.get.addRoute(path, fn);
  }
  post(path: string, fn: (route:string) => Promise<any>) {
    this.handlers.post.arrRoute(path, fn)
  }
  put(path: string, fn: (route:string) => Promise<any>) {
    this.handlers.put.addRoute(path, fn);
  }
  use(middleware:any) {
    // lol
  }
  onRequest(message: any) {
    let request = new Request(protocol.decode(message)); // also deals with deserializer
    try {
      let match = this.handlers[request.method].match(request.url);
      request.params = match.params;

      match.fn(request, new Response(request));
    } catch (e) {
      request.respond(null, 500);
    }
    return request.promise;
  }
}

export default () => new Server();