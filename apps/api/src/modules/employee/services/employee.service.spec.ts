import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeStatus } from '@prisma/client';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let prisma: any;

  const mockPrisma = {
    employee: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    employeeDocument: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    employment: {
      findMany: jest.fn(),
    },
  };

  const mockEmployee = {
    id: 'emp-1',
    tenantId: 'default',
    employeeId: 'EMP001',
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '08123456789',
    status: EmployeeStatus.ACTIVE,
    gender: 'MALE',
    maritalStatus: 'SINGLE',
    startDate: new Date('2026-01-01'),
    birthDate: new Date('1990-01-01'),
    city: 'Jakarta',
    province: 'DKI Jakarta',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    employments: [],
    documents: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an employee successfully', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(null);
      mockPrisma.employee.create.mockResolvedValue(mockEmployee);

      const dto = {
        employeeId: 'EMP001',
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '08123456789',
        gender: 'MALE',
        maritalStatus: 'SINGLE',
      };

      const result = await service.create('default', dto as any);

      expect(result).toEqual(mockEmployee);
      expect(mockPrisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'default',
          employeeId: 'EMP001',
          fullName: 'John Doe',
          email: 'john@example.com',
        }),
        include: { employments: true, documents: true },
      });
    });

    it('should throw ConflictException if employeeId already exists', async () => {
      mockPrisma.employee.findUnique.mockResolvedValueOnce(mockEmployee);

      const dto = {
        employeeId: 'EMP001',
        fullName: 'John Doe',
        email: 'john@example.com',
      };

      await expect(service.create('default', dto as any)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.employee.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockEmployee);

      const dto = {
        employeeId: 'EMP002',
        fullName: 'Jane Doe',
        email: 'john@example.com',
      };

      await expect(service.create('default', dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return a paginated envelope when page is provided', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([mockEmployee]);
      mockPrisma.employee.count.mockResolvedValue(1);

      const filters = { page: 1, limit: 10 };
      const result = await service.findAll('default', filters as any);

      expect(result).toEqual({
        data: [mockEmployee],
        total: 1,
        page: 1,
        pageSize: 10,
      });
      expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'default', deletedAt: null },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should return all employees with filters (unpaginated)', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([mockEmployee]);

      const result = await service.findAll('default', {} as any);

      expect(result).toEqual([mockEmployee]);
      expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'default', deletedAt: null },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply search filter', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([mockEmployee]);

      await service.findAll('default', { search: 'John' } as any);

      expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ fullName: { contains: 'John', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an employee by id', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);

      const result = await service.findOne('default', 'emp-1');

      expect(result).toEqual(mockEmployee);
      expect(mockPrisma.employee.findFirst).toHaveBeenCalledWith({
        where: { id: 'emp-1', tenantId: 'default', deletedAt: null },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.findOne('default', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an employee successfully', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.employee.update.mockResolvedValue({ ...mockEmployee, fullName: 'John Updated' });

      const result = await service.update('default', 'emp-1', { fullName: 'John Updated' });

      expect(result.fullName).toBe('John Updated');
    });

    it('should throw ConflictException if email already in use', async () => {
      mockPrisma.employee.findFirst
        .mockResolvedValueOnce(mockEmployee)
        .mockResolvedValueOnce({ id: 'emp-2', email: 'taken@example.com' });

      await expect(
        service.update('default', 'emp-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft-delete an employee', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.employee.update.mockResolvedValue({
        ...mockEmployee,
        deletedAt: new Date(),
        status: EmployeeStatus.INACTIVE,
      });

      const result = await service.remove('default', 'emp-1');

      expect(result.deletedAt).toBeDefined();
      expect(result.status).toBe(EmployeeStatus.INACTIVE);
      expect(mockPrisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        data: { deletedAt: expect.any(Date), status: EmployeeStatus.INACTIVE },
      });
    });
  });

  describe('bulkImport', () => {
    it('should import employees and return summary', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(null);
      mockPrisma.employee.create.mockResolvedValue(mockEmployee);

      const employees = [
        { employeeId: 'EMP001', fullName: 'John', email: 'john@test.com' },
        { employeeId: 'EMP002', fullName: 'Jane', email: 'jane@test.com' },
      ];

      const result = await service.bulkImport('default', employees as any);

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should skip duplicates in bulk import', async () => {
      mockPrisma.employee.findUnique
        .mockResolvedValueOnce(mockEmployee)
        .mockResolvedValueOnce(null);
      mockPrisma.employee.create.mockResolvedValue(mockEmployee);

      const employees = [
        { employeeId: 'EMP001', fullName: 'John', email: 'john@test.com' },
        { employeeId: 'EMP002', fullName: 'Jane', email: 'jane@test.com' },
      ];

      const result = await service.bulkImport('default', employees as any);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe('export', () => {
    it('should export employees as flat array', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([mockEmployee]);

      const result = await service.export('default', {} as any);

      expect(result).toEqual([
        expect.objectContaining({
          employeeId: 'EMP001',
          fullName: 'John Doe',
          email: 'john@example.com',
        }),
      ]);
    });
  });

  describe('uploadDocument', () => {
    it('should upload a document for an employee', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.employeeDocument.create.mockResolvedValue({
        id: 'doc-1',
        employeeId: 'emp-1',
        fileName: 'resume.pdf',
      });

      const file = { originalname: 'resume.pdf', path: '/uploads/resume.pdf', size: 1024, mimetype: 'application/pdf' } as Express.Multer.File;
      const result = await service.uploadDocument('default', 'emp-1', file, 'ID_CARD');

      expect(result.fileName).toBe('resume.pdf');
    });
  });
});
