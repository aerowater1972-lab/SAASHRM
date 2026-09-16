import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '@common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let configService: any;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: '$2a$12$hashedpassword',
    fullName: 'Test User',
    tenantId: 'default',
    employeeId: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    mfaSecret: null,
    userRoles: [],
  };

  const sanitizedUser = {
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    tenantId: 'default',
    employeeId: null,
    lastLoginAt: null,
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    configService = module.get(ConfigService);

    (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$12$hashedpassword');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const dto = { email: 'test@example.com', password: 'password123', fullName: 'Test User' };
      const result = await service.register('default', dto);

      expect(result.user).toEqual(sanitizedUser);
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(jwt.sign).toHaveBeenCalledTimes(2);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const dto = { email: 'test@example.com', password: 'password123', fullName: 'Test User' };
      await expect(service.register('default', dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when ALLOW_PUBLIC_REGISTER=false', async () => {
      (configService.get as jest.Mock).mockImplementationOnce((key: string) =>
        key === 'ALLOW_PUBLIC_REGISTER' ? 'false' : undefined,
      );

      const dto = { email: 'new@example.com', password: 'password123', fullName: 'New User' };
      await expect(service.register('default', dto)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.login('default', 'test@example.com', 'password123');

      expect(result.user).toEqual(sanitizedUser);
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login('default', 'wrong@email.com', 'password123')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('default', 'test@example.com', 'wrongpassword')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ sub: 'user-1', email: 'test@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user).toEqual(sanitizedUser);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ sub: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should return success message', async () => {
      const result = await service.logout('user-1');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
