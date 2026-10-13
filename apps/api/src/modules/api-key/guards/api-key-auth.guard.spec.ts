import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { REQUIRE_API_KEY_SCOPES_KEY } from '../decorators/require-api-key-scopes.decorator';

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;
  let reflector: any;
  let apiKeyService: any;

  const validKey = {
    id: 'key-1',
    tenantId: 'tenant-1',
    keyPrefix: 'abcdef123456',
    scopes: ['slack:write'],
  };

  const createContext = (headers: Record<string, string>) => {
    const request: any = { headers };
    const handler = function handler() {};
    class RouteClass {}
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => handler,
      getClass: () => RouteClass,
      request,
    };
    return context;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    apiKeyService = { verify: jest.fn() };
    guard = new ApiKeyAuthGuard(reflector, apiKeyService);
  });

  it('rejects requests without an X-API-Key header', async () => {
    const context = createContext({});
    await expect(guard.canActivate(context as any)).rejects.toThrow(UnauthorizedException);
    expect(apiKeyService.verify).not.toHaveBeenCalled();
  });

  it('rejects an invalid or revoked API key', async () => {
    apiKeyService.verify.mockResolvedValue(null);
    const context = createContext({ 'x-api-key': 'wrong' });
    await expect(guard.canActivate(context as any)).rejects.toThrow(UnauthorizedException);
  });

  it('passes a valid key on routes without scope metadata and exposes the tenant', async () => {
    apiKeyService.verify.mockResolvedValue(validKey);
    const context = createContext({ 'x-api-key': 'good' });
    await expect(guard.canActivate(context as any)).resolves.toBe(true);
    expect(context.request.user.tenantId).toBe('tenant-1');
    expect(context.request.user.sub).toBe('apikey:key-1');
    expect(context.request.apiKey).toBe(validKey);
  });

  it('allows access when the key holds the required scope (UAT OA-02-08)', async () => {
    reflector.getAllAndOverride.mockReturnValue(['slack:write']);
    apiKeyService.verify.mockResolvedValue(validKey);
    const context = createContext({ 'x-api-key': 'good' });
    await expect(guard.canActivate(context as any)).resolves.toBe(true);
  });

  it('denies access with 403 when the key lacks the required scope (UAT OA-02-08)', async () => {
    reflector.getAllAndOverride.mockReturnValue(['slack:notice']);
    apiKeyService.verify.mockResolvedValue({ ...validKey, scopes: ['slack:write'] });
    const context = createContext({ 'x-api-key': 'good' });
    await expect(guard.canActivate(context as any)).rejects.toThrow(ForbiddenException);
  });

  it("allows a wildcard '*' scope on any route", async () => {
    reflector.getAllAndOverride.mockReturnValue(['slack:notice']);
    apiKeyService.verify.mockResolvedValue({ ...validKey, scopes: ['*'] });
    const context = createContext({ 'x-api-key': 'good' });
    await expect(guard.canActivate(context as any)).resolves.toBe(true);
  });

  it('queries the reflector with the API scopes metadata key', async () => {
    apiKeyService.verify.mockResolvedValue(validKey);
    const context = createContext({ 'x-api-key': 'good' });
    await guard.canActivate(context as any);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_API_KEY_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
