import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, tenantId } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        if (method !== 'GET') {
          this.logger.debug(
            JSON.stringify({
              action: `${method} ${url}`,
              userId: user?.sub,
              tenantId,
              duration,
              timestamp: new Date().toISOString(),
            }),
          );
        }
      }),
    );
  }
}
