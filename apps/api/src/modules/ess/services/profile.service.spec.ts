import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';

describe('ProfileService (BR-02)', () => {
  let service: ProfileService;
  const mockPrisma: any = {
    essProfileChangeRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const mockEmployeeService: any = {
    findById: jest.fn(),
    emailExists: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
      ],
    }).compile();
    service = module.get(ProfileService);
    jest.clearAllMocks();
  });

  it('applies basic contact fields directly and creates no change request', async () => {
    mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', email: 'a@b.com' });
    mockEmployeeService.update.mockResolvedValue({ id: 'emp-1', phone: '123' });

    const result = await service.updateProfile('default', 'emp-1', { phone: '123' } as any);

    expect(mockEmployeeService.update).toHaveBeenCalledWith('default', 'emp-1', { phone: '123' });
    expect(mockPrisma.essProfileChangeRequest.create).not.toHaveBeenCalled();
    expect(result.pendingSensitiveChanges).toBeNull();
  });

  it('routes sensitive fields (NPWP/BPJS) to a pending change request (BR-02)', async () => {
    mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', email: 'a@b.com' });
    mockPrisma.essProfileChangeRequest.create.mockResolvedValue({ id: 'cr-1', status: 'PENDING' });

    const result = await service.updateProfile('default', 'emp-1', {
      taxIdNumber: '123',
      socialSecurityNumber: '456',
      npwp: '789',
    } as any);

    expect(mockEmployeeService.update).not.toHaveBeenCalled();
    expect(mockPrisma.essProfileChangeRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          fields: expect.objectContaining({ taxIdNumber: '123', socialSecurityNumber: '456' }),
        }),
      }),
    );
    expect(result.pendingSensitiveChanges).toBeDefined();
  });

  it('applies a sensitive change only after HR approval (BR-02)', async () => {
    mockPrisma.essProfileChangeRequest.findUnique.mockResolvedValue({
      id: 'cr-1',
      tenantId: 'default',
      employeeId: 'emp-1',
      status: 'PENDING',
      fields: { taxIdNumber: '999' },
    });

    await service.reviewChangeRequest('default', 'cr-1', 'hr-1', true);

    expect(mockEmployeeService.update).toHaveBeenCalledWith('default', 'emp-1', { taxIdNumber: '999' });
    expect(mockPrisma.essProfileChangeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED', reviewedBy: 'hr-1' }) }),
    );
  });

  it('does not apply on rejection (BR-02)', async () => {
    mockPrisma.essProfileChangeRequest.findUnique.mockResolvedValue({
      id: 'cr-1',
      tenantId: 'default',
      employeeId: 'emp-1',
      status: 'PENDING',
      fields: { taxIdNumber: '999' },
    });

    await service.reviewChangeRequest('default', 'cr-1', 'hr-1', false, 'nope');

    expect(mockEmployeeService.update).not.toHaveBeenCalled();
    expect(mockPrisma.essProfileChangeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED' }) }),
    );
  });

  it('rejects reviewing an already-reviewed request', async () => {
    mockPrisma.essProfileChangeRequest.findUnique.mockResolvedValue({
      id: 'cr-1',
      tenantId: 'default',
      status: 'APPROVED',
    });
    await expect(service.reviewChangeRequest('default', 'cr-1', 'hr-1', true)).rejects.toThrow(
      BadRequestException,
    );
  });
});
