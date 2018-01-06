
import protocol from './protocol';
import Router from 'routes';
import { Response } from './response';
import { Request } from './request';

module.exports = () => {
  // returns app
  class Server {
    handlers: { get: Router; post: Router; put: Router; };
    constructor() {
      this.handlers = {
        get: Router(),
        post: Router(),
        put: Router()
      };
    }
    get(path: string, fn: (string) => Promise<any>) {
      this.handlers.get.addRoute(path, fn);
    }
    post(path: string, fn: (string) => Promise<any>) {
      this.handlers.post.arrRoute(path, fn)
    }
    put(path: string, fn: (string) => Promise<any>) {
      this.handlers.put.addRoute(path, fn);
    }
    use(middleware:any) {
      // lol
    }
    onRequest(peer, message: any) {
      try {
        let request = new Request(peer, protocol.decode(message)); // also deals with deserializer
        let match = this.handlers[request.method].match(request.url);
        request.params = match.params;

        match.fn(request, new Response(request));
      } catch (e) {
        request.send(500);
      }
      return request.promise;
    }
  }
};