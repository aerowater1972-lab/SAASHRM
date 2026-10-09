import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PayslipService } from './payslip.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { MailService } from '@modules/integrations/services/mail.service';

const mockMail = { sendMail: jest.fn() };

/**
 * Privasi slip gaji: tanpa payroll:run:read, query dipaksa ke milik token;
 * pemilik penuh, orang lain Forbidden. Masking berbasis ID role yang mati
 * sudah dihapus (JWT tak membawa klaim role).
 */
describe('PayslipService - viewer scoping', () => {
  let service: PayslipService;

  const mockPrisma = {
    payslip: { findMany: jest.fn(), findFirst: jest.fn() },
    employment: { findMany: jest.fn() },
    payrollItem: { findMany: jest.fn() },
  };

  const empViewer = { employeeId: 'emp-1', permissions: ['payroll:payslip:read'] };
  const hrViewer = { employeeId: 'hr-1', permissions: ['payroll:payslip:read', 'payroll:run:read', 'payroll:run:approve'] };
  const mgrViewer = { employeeId: 'mgr-1', permissions: ['payroll:payslip:read', 'payroll:run:read'] };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayslipService, { provide: PrismaService, useValue: mockPrisma }, { provide: MailService, useValue: mockMail }],
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

describe('PayslipService - generatePdf', () => {
  let service: PayslipService;

  const mockPrisma = {
    payslip: { findFirst: jest.fn(), findMany: jest.fn() },
    employment: { findMany: jest.fn() },
    payrollItem: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayslipService, { provide: PrismaService, useValue: mockPrisma }, { provide: MailService, useValue: mockMail }],
    }).compile();

    service = module.get<PayslipService>(PayslipService);
  });

  afterEach(() => jest.clearAllMocks());

  it('menghasilkan PDF valid dengan rincian komponen + YTD', async () => {
    mockPrisma.payslip.findFirst.mockResolvedValue({
      id: 'p-1', tenantId: 't1', employeeId: 'emp-1',
      grossPay: 8000000, totalDeductions: 1000000, netPay: 7000000,
      employee: { fullName: 'Budi', employeeId: 'E001', employments: [] },
      run: { name: 'PR-1', period: { name: 'Jan 2026' } },
      items: [],
    });
    mockPrisma.payrollItem.findMany.mockResolvedValue([
      { id: 'i-1', description: 'Gaji Pokok', amount: 8000000, component: { type: 'EARNING', name: 'Gaji' } },
      { id: 'i-2', description: 'BPJS Kes', amount: 1000000, component: { type: 'BPJS_KES', name: 'BPJS' } },
    ]);
    mockPrisma.payslip.findMany.mockResolvedValue([
      { grossPay: 8000000, totalDeductions: 1000000, netPay: 7000000 },
    ]);

    const res = await service.generatePdf('t1', 'p-1', {
      employeeId: 'hr-1',
      permissions: ['payroll:payslip:read', 'payroll:run:read', 'payroll:run:approve'],
    });

    expect(res.contentType).toBe('application/pdf');
    expect(res.filename).toMatch(/\.pdf$/);
    const raw = Buffer.from(res.data, 'base64').toString('utf-8');
    expect(raw.startsWith('%PDF-1.4')).toBe(true);
    expect(raw).toContain('Gaji Pokok');
    expect(raw).toContain('YTD');
  });
});

describe('PayslipService - sendEmail', () => {
  let service: PayslipService;

  const mockPrisma: any = {
    payslip: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    employment: { findMany: jest.fn() },
    payrollItem: { findMany: jest.fn() },
    payslipItem: { findMany: jest.fn() },
  };
  const mockMailSvc = { sendMail: jest.fn() };
  const hrViewer = { employeeId: 'hr-1', permissions: ['payroll:payslip:read', 'payroll:run:read', 'payroll:run:approve'] };

  const slip = (over: any = {}) => ({
    id: 'p-1', tenantId: 't1', employeeId: 'emp-1',
    grossPay: 8000000, totalDeductions: 1000000, netPay: 7000000,
    employee: { fullName: 'Budi', employeeId: 'E001', email: 'budi@example.id', employments: [] },
    run: { name: 'PR-1', period: { name: 'Jan 2026' } },
    items: [],
    ...over,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayslipService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailSvc },
      ],
    }).compile();
    service = module.get<PayslipService>(PayslipService);
  });

  afterEach(() => jest.clearAllMocks());

  it('sends PDF to employee registered email and stamps emailedAt', async () => {
    mockPrisma.payslip.findFirst.mockResolvedValue(slip());
    mockPrisma.payrollItem.findMany.mockResolvedValue([]);
    mockPrisma.payslip.findMany.mockResolvedValue([]);
    mockMailSvc.sendMail.mockResolvedValue({ success: true, provider: 'LOG', messageId: 'm1', to: 'budi@example.id' });
    mockPrisma.payslip.update.mockImplementation((args: any) => Promise.resolve({ id: 'p-1', ...args.data }));

    const res: any = await service.sendEmail('t1', 'p-1', hrViewer);
    expect(res.mailed).toBe(true);
    expect(res.to).toBe('budi@example.id');
    expect(mockMailSvc.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'budi@example.id',
      attachments: [expect.objectContaining({ contentType: 'application/pdf' })],
    }));
    expect(mockPrisma.payslip.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ emailTo: 'budi@example.id' }),
    }));
  });

  it('allows HR override address, blocks non-FULL override', async () => {
    mockPrisma.payslip.findFirst.mockResolvedValue(slip());
    mockPrisma.payrollItem.findMany.mockResolvedValue([]);
    mockPrisma.payslip.findMany.mockResolvedValue([]);
    mockMailSvc.sendMail.mockResolvedValue({ success: true, provider: 'LOG', messageId: 'm2', to: 'x@y.id' });

    const res: any = await service.sendEmail('t1', 'p-1', hrViewer, 'x@y.id');
    expect(res.to).toBe('x@y.id');

    const mgrViewer = { employeeId: 'mgr-1', permissions: ['payroll:payslip:read', 'payroll:run:read'] };
    mockPrisma.employment.findMany.mockResolvedValue([{ departmentId: 'd1' }]);
    const slipMgr = slip({ employee: { fullName: 'Budi', employeeId: 'E001', email: 'budi@example.id', employments: [{ departmentId: 'd1', isActive: true }] } });
    mockPrisma.payslip.findFirst.mockResolvedValue(slipMgr);
    const res2: any = await service.sendEmail('t1', 'p-1', mgrViewer, 'x@y.id');
    expect(res2.to).toBe('budi@example.id');
  });

  it('fails when employee has no email and no override', async () => {
    mockPrisma.payslip.findFirst.mockResolvedValue(slip({ employee: { fullName: 'Anon', employments: [] } }));
    await expect(service.sendEmail('t1', 'p-1', hrViewer)).rejects.toThrow('tidak punya email');
    expect(mockMailSvc.sendMail).not.toHaveBeenCalled();
  });

  it('surfaces mail provider failure without stamping', async () => {
    mockPrisma.payslip.findFirst.mockResolvedValue(slip());
    mockPrisma.payrollItem.findMany.mockResolvedValue([]);
    mockPrisma.payslip.findMany.mockResolvedValue([]);
    mockMailSvc.sendMail.mockResolvedValue({ success: false, provider: 'SMTP', to: 'budi@example.id', error: 'ECONNREFUSED' });
    await expect(service.sendEmail('t1', 'p-1', hrViewer)).rejects.toThrow('Gagal mengirim email');
    expect(mockPrisma.payslip.update).not.toHaveBeenCalled();
  });
});
