const Router = require('routes');
import {Response} from './response';
import {Request} from './request';

// returns app
export class Server {
  handlers: { get: any; post: any; put: any; };

  constructor() {
    this.handlers = {
      get: Router(),
      post: Router(),
      put: Router()
    };
  }

  get(path: string, fn: (route: string) => Promise<any>) {
    this.handlers.get.addRoute(path, fn);
  }

  post(path: string, fn: (route: string) => Promise<any>) {
    this.handlers.post.addRoute(path, fn)
  }

  put(path: string, fn: (route: string) => Promise<any>) {
    this.handlers.put.addRoute(path, fn);
  }

  onRequest(url: string, method: 'get' | 'post' | 'put', body: any) {
    let request = new Request({url, method, body}); // also deals with deserializer
    try {
      let match = this.handlers[request.method].match(request.url);
      request.params = match.params;

      match.fn(request, new Response(request));
    } catch (e) {
      request.respond({error: e.message || 'Unknown Error Occurred'}, e.status || 500);
    }
    return request.promise;
  }
}

export default () => new Server();
