
import protocol from './protocol';
import Router from 'routes';

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
    onRequest(request) {
      try {
      let {method, url, body} = protocol.decode(request.content); // also deals with deserializer
      let match = this.handlers[method].match(request.url);
      match.fn({url, body, method, params: match.params}, {
        json(data) {
          request.data(data);
        },
        status(code) {
          request.status(code);
        }
      });
      } catch (e) {
        request.send(500);
      }
    }
  }
};