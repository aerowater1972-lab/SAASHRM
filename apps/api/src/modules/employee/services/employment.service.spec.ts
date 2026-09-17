import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EmploymentService } from './employment.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from './employee.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { NotificationService } from '@modules/shared/notification/notification.service';

/**
 * Validasi masa percobaan (UU 13/2003 Art 60-63): wajib tertulis
 * (endDate) dan maksimal 3 bulan kalender.
 */
describe('EmploymentService - probation validation', () => {
  let service: EmploymentService;

  const mockPrisma = {
    employee: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    department: { findFirst: jest.fn() },
    position: { findFirst: jest.fn() },
    grade: { findFirst: jest.fn() },
    employment: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    tenant: { findMany: jest.fn() },
    essNotification: { findFirst: jest.fn() },
  };
  const mockNotification = { send: jest.fn() };
  const mockEmployeeService = { findById: jest.fn() };
  const mockEventBus = { publish: jest.fn() };

  const baseDto = {
    positionId: 'pos-1',
    departmentId: 'dept-1',
    type: 'PROBATION',
    startDate: '2026-09-01',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmploymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<EmploymentService>(EmploymentService);

    mockPrisma.employee.findFirst.mockResolvedValue({ id: 'emp-1', status: 'ACTIVE' });
    mockPrisma.department.findFirst.mockResolvedValue({ id: 'dept-1' });
    mockPrisma.position.findFirst.mockResolvedValue({ id: 'pos-1' });
    mockPrisma.employment.findFirst.mockResolvedValue(null);
    mockPrisma.employment.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'em-1', ...data }));
  });

  afterEach(() => jest.clearAllMocks());

  it('menolak probation tanpa endDate tertulis', async () => {
    await expect(service.create('t1', 'emp-1', { ...baseDto } as any)).rejects.toThrow(/tertulis/);
    expect(mockPrisma.employment.create).not.toHaveBeenCalled();
  });

  it('menolak probation lebih dari 3 bulan', async () => {
    await expect(
      service.create('t1', 'emp-1', { ...baseDto, endDate: '2027-01-01' } as any),
    ).rejects.toThrow(/3 bulan/);
  });

  it('mengizinkan tepat 3 bulan (1 Sep - 1 Des)', async () => {
    const r: any = await service.create('t1', 'emp-1', { ...baseDto, endDate: '2026-12-01' } as any);
    expect(r.id).toBe('em-1');
  });

  it('tidak menerapkan aturan probation ke tipe lain', async () => {
    const r: any = await service.create(
      't1',
      'emp-1',
      { ...baseDto, type: 'PERMANENT', endDate: undefined } as any,
    );
    expect(r.id).toBe('em-1');
  });
});

describe('EmploymentService - retirement reminder', () => {
  let service: EmploymentService;

  const mockPrisma = {
    tenant: { findMany: jest.fn() },
    employee: { findMany: jest.fn() },
    essNotification: { findFirst: jest.fn() },
  };
  const mockNotification = { send: jest.fn() };

  const nearing = (id: string, birthDate: string) => ({ id, fullName: `Emp ${id}`, employeeId: id, birthDate: new Date(birthDate) });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmploymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: {} },
        { provide: EventBusService, useValue: {} },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<EmploymentService>(EmploymentService);
    mockPrisma.tenant.findMany.mockResolvedValue([{ id: 't1', settings: {} }]);
    mockPrisma.essNotification.findFirst.mockResolvedValue(null);
  });

  afterEach(() => jest.clearAllMocks());

  it('memberi tahu karyawan yang mencapai usia pensiun dalam jendela', async () => {
    const turn56 = new Date();
    turn56.setFullYear(turn56.getFullYear() - 56);
    turn56.setDate(turn56.getDate() + 100); // pensiun 100 hari lagi
    mockPrisma.employee.findMany.mockResolvedValue([nearing('emp-1', turn56.toISOString())]);

    const sent = await service.runRetirementReminderCheck(180);

    expect(sent).toBe(1);
    expect(mockNotification.send).toHaveBeenCalledWith(
      expect.objectContaining({ templateKey: 'retirement.reminder', employeeId: 'emp-1' }),
    );
  });

  it('melewatkan yang masih jauh dan yang tanpa tanggal lahir', async () => {
    const far = new Date();
    far.setFullYear(far.getFullYear() - 30);
    mockPrisma.employee.findMany.mockResolvedValue([
      nearing('emp-far', far.toISOString()),
      { id: 'emp-nobd', fullName: 'X', employeeId: 'X', birthDate: null },
    ]);

    expect(await service.runRetirementReminderCheck(180)).toBe(0);
    expect(mockNotification.send).not.toHaveBeenCalled();
  });

  it('tidak spam: lewati bila sudah diingatkan dalam jendela', async () => {
    const turn56 = new Date();
    turn56.setFullYear(turn56.getFullYear() - 56);
    turn56.setDate(turn56.getDate() + 10);
    mockPrisma.employee.findMany.mockResolvedValue([nearing('emp-1', turn56.toISOString())]);
    mockPrisma.essNotification.findFirst.mockResolvedValue({ id: 'n-1' });

    expect(await service.runRetirementReminderCheck(180)).toBe(0);
    expect(mockNotification.send).not.toHaveBeenCalled();
  });

  it('memakai retirementAge kustom tenant', async () => {
    mockPrisma.tenant.findMany.mockResolvedValue([{ id: 't1', settings: { retirementAge: 60 } }]);
    const turn60 = new Date();
    turn60.setFullYear(turn60.getFullYear() - 60);
    turn60.setDate(turn60.getDate() + 100); // ultah ke-60 seratus hari lagi (lewat bila batas 56)
    mockPrisma.employee.findMany.mockResolvedValue([nearing('emp-1', turn60.toISOString())]);

    expect(await service.runRetirementReminderCheck(180)).toBe(1);
  });
});
