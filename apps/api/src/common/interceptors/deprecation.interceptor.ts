import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { DEPRECATED_KEY } from '../decorators/deprecated.decorator';

/**
 * Adds `Deprecation: true` + `Sunset` headers to responses from
 * handlers decorated with @Deprecated().
 * Registered globally via APP_INTERCEPTOR.
 */
@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<
      { version?: string; message?: string; removedInVersion?: string } | undefined
    >(DEPRECATED_KEY, context.getHandler());

    if (metadata) {
      const res = context.switchToHttp().getResponse();
      res.setHeader('Deprecation', 'true');
      if (metadata.version) {
        res.setHeader('Deprecation-Version', metadata.version);
      }
      if (metadata.removedInVersion) {
        res.setHeader('Sunset', metadata.removedInVersion);
      }
      const msg = `Deprecated API${metadata.version ? ` v${metadata.version}` : ''}${metadata.message ? `: ${metadata.message}` : ''}`;
      res.setHeader('Warning', `299 - "${msg}"`);
    }

    return next.handle();
  }
}
