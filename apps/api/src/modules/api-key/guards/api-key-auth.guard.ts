import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string | undefined;
    if (!apiKey) {
      this.logger.warn('API key missing from request headers');
      throw new UnauthorizedException('API key required (X-API-Key header)');
    }

    const apiKeyRecord = await this.apiKeyService.verify(apiKey);
    if (!apiKeyRecord) {
      this.logger.warn('Invalid API key provided');
      throw new UnauthorizedException('Invalid API key');
    }

    // Expose the tenant so TenantGuard/@TenantId resolve the API key's tenant
    request.user = {
      ...request.user,
      tenantId: apiKeyRecord.tenantId,
      sub: `apikey:${apiKeyRecord.id}`,
    };
    request.apiKey = apiKeyRecord;
    return true;
  }
}
