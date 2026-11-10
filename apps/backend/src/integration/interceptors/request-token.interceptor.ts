import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import {
  requestTokenContext,
  RequestTokenStore,
} from '../context/request-token.context';

/**
 * Captures the caller's raw bearer token from the `Authorization` header into an
 * `AsyncLocalStorage` so the kalnostics-new API clients can forward it on
 * service-to-service calls. Registered globally (runs for every request); a
 * request with no/other auth simply stores nothing.
 */
@Injectable()
export class RequestTokenInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization ?? '';
    const [type, token] = header.split(' ');
    const store: RequestTokenStore =
      type === 'Bearer' && token ? { bearerToken: token } : {};

    return new Observable((subscriber) => {
      requestTokenContext.run(store, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
