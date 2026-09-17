import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PayslipService } from './payslip.service';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Privasi slip gaji: tanpa payroll:run:read, query dipaksa ke milik token;
 * pemilik penuh, orang lain Forbidden. Masking berbasis ID role yang mati
 * sudah dihapus (JWT tak membawa klaim role).
 */
describe('PayslipService - viewer scoping', () => {
  let service: PayslipService;

  const mockPrisma = { payslip: { findMany: jest.fn(), findFirst: jest.fn() }, employment: { findMany: jest.fn() } };

  const empViewer = { employeeId: 'emp-1', permissions: ['payroll:payslip:read'] };
  const hrViewer = { employeeId: 'hr-1', permissions: ['payroll:payslip:read', 'payroll:run:read', 'payroll:run:approve'] };
  const mgrViewer = { employeeId: 'mgr-1', permissions: ['payroll:payslip:read', 'payroll:run:read'] };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayslipService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PayslipService>(PayslipService);
  });

  afterEach(() => jest.clearAllMocks());

  it('karyawan: filter orang lain diabaikan, dipaksa ke milik sendiri', async () => {
    mockPrisma.payslip.findMany.mockResolvedValue([]);

    await service.findAll('t1', empViewer, { employeeId: 'emp-OTHER' });

    expect(mockPrisma.payslip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ employeeId: 'emp-1' }) }),
    );
  });

  it('karyawan tanpa employeeId tertaut -> Forbidden', async () => {
    await expect(
      service.findAll('t1', { employeeId: null, permissions: ['payroll:payslip:read'] }, {}),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.payslip.findMany).not.toHaveBeenCalled();
  });

  it('manager: daftar dibatasi departemennya', async () => {
    mockPrisma.employment.findMany.mockResolvedValue([{ departmentId: 'dept-1' }]);
    mockPrisma.payslip.findMany.mockResolvedValue([]);

    await service.findAll('t1', mgrViewer, {});

    expect(mockPrisma.payslip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employee: { employments: { some: { departmentId: { in: ['dept-1'] }, isActive: true } } },
        }),
      }),
    );
  });

  it('manager: slip luar departemen -> Forbidden; dalam departemen -> lolos', async () => {
    mockPrisma.employment.findMany.mockResolvedValue([{ departmentId: 'dept-1' }]);
    mockPrisma.payslip.findFirst.mockResolvedValue({
      id: 'p-x', employeeId: 'emp-9', employee: { employments: [{ departmentId: 'dept-9', isActive: true }] },
    });
    await expect(service.findOne('t1', 'p-x', mgrViewer)).rejects.toThrow('departemen');

    mockPrisma.payslip.findFirst.mockResolvedValue({
      id: 'p-y', employeeId: 'emp-2', employee: { employments: [{ departmentId: 'dept-1', isActive: true }] },
    });
    const res = await service.findOne('t1', 'p-y', mgrViewer);
    expect(res.id).toBe('p-y');
  });

  it('HR (payroll:run:read): filter dihormati', async () => {
    mockPrisma.payslip.findMany.mockResolvedValue([]);

    await service.findAll('t1', hrViewer, { employeeId: 'emp-OTHER' });

    expect(mockPrisma.payslip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ employeeId: 'emp-OTHER' }) }),
    );
  });

  it('karyawan membuka slip orang lain -> Forbidden', async () => {
    mockPrisma.payslip.findFirst.mockResolvedValue({ id: 'p-1', employeeId: 'emp-OTHER' });

    await expect(service.findOne('t1', 'p-1', empViewer)).rejects.toThrow(ForbiddenException);
  });

  it('karyawan membuka slip sendiri -> penuh', async () => {
    mockPrisma.payslip.findFirst.mockResolvedValue({ id: 'p-1', employeeId: 'emp-1', netPay: 100 });

    const res: any = await service.findOne('t1', 'p-1', empViewer);

    expect(res.netPay).toBe(100);
  });

  it('slip hilang -> NotFound', async () => {
    mockPrisma.payslip.findFirst.mockResolvedValue(null);

    await expect(service.findOne('t1', 'nope', hrViewer)).rejects.toThrow(NotFoundException);
  });
});
