import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from './audit.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('UserManagementService', () => {
  let service: UserManagementService;
  let prisma: any;
  let audit: any;

  const mockUser = {
    id: 'user-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    tenantId: 'default',
    employeeId: null,
    status: 'ACTIVE',
    passwordHash: '$2a$12$hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    mfaSecret: null,
    userRoles: [{ role: { id: 'role-superadmin', name: 'Super Admin', isSystem: true } }],
  };

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    employee: { findFirst: jest.fn() },
    role: { findMany: jest.fn(), findFirst: jest.fn() },
    userRole: { deleteMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserManagementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: { ingest: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(UserManagementService);
    prisma = module.get(PrismaService);
    audit = module.get(AuditService);

    (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$12$hashed');
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$12$hashed');
    audit.ingest.mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('throws ConflictException when email already exists in tenant', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.create('default', { email: 'admin@example.com', password: 'Str0ngP@ss1', fullName: 'X' }, 'actor'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates user, assigns roles and emits audit', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.role.findMany.mockResolvedValue([{ id: 'role-hr', tenantId: 'default' }]);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create(
        'default',
        { email: 'admin@example.com', password: 'Str0ngP@ss1', fullName: 'Admin', roleIds: ['role-hr'] },
        'actor',
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 'user-1',
          email: 'admin@example.com',
          tenantId: 'default',
        }),
      );
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('mfaSecret');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'default', email: 'admin@example.com' }),
        }),
      );
      expect(audit.ingest).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entity: 'User', entityId: 'user-1' }),
      );
    });

    it('throws BadRequestException for unknown role id', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.role.findMany.mockResolvedValue([]);
      await expect(
        service.create('default', { email: 'a@b.com', password: 'Str0ngP@ss1', fullName: 'A', roleIds: ['nope'] }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate (BR-01)', () => {
    it('throws ForbiddenException when deactivating the last active System Admin', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.count.mockResolvedValue(1);

      await expect(service.deactivate('default', 'user-1', 'actor')).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('deactivates a normal user and emits audit', async () => {
      const normalUser = { ...mockUser, userRoles: [{ role: { id: 'role-hr', isSystem: false } }] };
      prisma.user.findFirst.mockResolvedValue(normalUser);
      prisma.user.update.mockResolvedValue({ ...normalUser, status: 'INACTIVE' });

      await service.deactivate('default', 'user-1', 'actor');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' }, data: { status: 'INACTIVE' } }),
      );
      expect(audit.ingest).toHaveBeenCalledWith(expect.objectContaining({ action: 'DEACTIVATE' }));
    });
  });

  describe('resetPassword', () => {
    it('sets provided password and returns it', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      const res = await service.resetPassword('default', 'user-1', { password: 'NewStr0ng1' }, 'actor');

      expect(res.password).toBe('NewStr0ng1');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewStr0ng1', 12);
      expect(audit.ingest).toHaveBeenCalledWith(expect.objectContaining({ action: 'RESET_PASSWORD' }));
    });
  });

  describe('revokeRole', () => {
    it('removes the user role and emits audit', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.role.findFirst.mockResolvedValue({ id: 'role-hr', tenantId: 'default' });
      prisma.userRole.deleteMany.mockResolvedValue({ count: 1 });

      await service.revokeRole('default', 'user-1', 'role-hr', 'actor');

      expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', roleId: 'role-hr' } });
      expect(audit.ingest).toHaveBeenCalledWith(expect.objectContaining({ action: 'REVOKE_ROLE' }));
    });

    it('throws NotFoundException for unknown role in tenant', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.role.findFirst.mockResolvedValue(null);
      await expect(service.revokeRole('default', 'user-1', 'role-x', 'actor')).rejects.toThrow(NotFoundException);
    });
  });

  describe('credential stripping (SEC-001)', () => {
    it('never returns passwordHash or mfaSecret from getById', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, mfaSecret: 'mfa-secret' });
      const result: any = await service.getById('default', 'user-1');
      expect(result.passwordHash).toBeUndefined();
      expect(result.mfaSecret).toBeUndefined();
      expect(result.email).toBe('admin@example.com');
    });
  });
});
