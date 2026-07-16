import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { setTenant } from '@common/tenant/tenant.context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId ?? request.headers['x-tenant-id'] ?? 'default';
    request.tenantId = tenantId;
    setTenant(request.user?.tenantId ?? tenantId);
    return next.handle();
  }
}
