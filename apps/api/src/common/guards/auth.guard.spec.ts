import { AuthGuard } from './auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: any;
  let configService: any;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(() => {
    reflector = mockReflector;
    configService = mockConfigService;
    guard = new AuthGuard(configService, reflector);
    jest.clearAllMocks();
  });

  const createMockContext = (headers: any = {}, cookies?: any) => {
    const request: any = {
      headers,
      cookies: cookies || {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access to public routes', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access with valid Bearer token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
        tenantId: 'default',
      });

      const context = createMockContext({ authorization: 'Bearer valid-token' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      const req = context.switchToHttp().getRequest();
      expect(req.user).toEqual({
        sub: 'user-1',
        email: 'test@example.com',
        tenantId: 'default',
        employeeId: null,
        role: undefined,
        permissions: [],
      });
    });

    it('should throw UnauthorizedException if no token provided', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const context = createMockContext({ authorization: 'Bearer invalid-token' });
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should extract token from cookie if Authorization header missing', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
        tenantId: 'default',
      });

      const context = createMockContext({}, { access_token: 'cookie-token' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwt.verify).toHaveBeenCalledWith('cookie-token', 'test-secret');
    });
  });
});
