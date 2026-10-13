import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '../services/api-key.service';
import { REQUIRE_API_KEY_SCOPES_KEY } from '../decorators/require-api-key-scopes.decorator';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeyService: ApiKeyService,
  ) {}

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

    // Scope enforcement (UAT OA-02-08): routes decorated with
    // @RequireApiKeyScopes(...) demand those scopes on the key. A key scoped
    // '*' satisfies every requirement.
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_API_KEY_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredScopes && requiredScopes.length > 0) {
      const keyScopes: string[] = Array.isArray(apiKeyRecord.scopes)
        ? apiKeyRecord.scopes
        : [];
      const missing = requiredScopes.filter(
        (scope) => !keyScopes.includes('*') && !keyScopes.includes(scope),
      );
      if (missing.length > 0) {
        this.logger.warn(
          `API key ${apiKeyRecord.keyPrefix}… missing scope(s): ${missing.join(', ')}`,
        );
        throw new ForbiddenException(
          `API key missing required scope(s): ${missing.join(', ')}`,
        );
      }
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

