import { Test, TestingModule } from '@nestjs/testing';
import { ShiftService } from './shift.service';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Cuti bersama (SKB): pembuatan holiday tipe COLLECTIVE memotong 1 hari
 * cuti tahunan (kode AL) tiap karyawan aktif yang punya baris saldo.
 */
describe('ShiftService.createHoliday - collective deduction', () => {
  let service: ShiftService;

  const mockPrisma = {
    holidayCalendar: { findUnique: jest.fn(), create: jest.fn() },
    leaveType: { findFirst: jest.fn() },
    employee: { findMany: jest.fn() },
    leaveBalance: { findUnique: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ShiftService>(ShiftService);
    mockPrisma.holidayCalendar.findUnique.mockResolvedValue(null);
    mockPrisma.holidayCalendar.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'hol-1', ...data }),
    );
  });

  afterEach(() => jest.clearAllMocks());

  const dto = (type: string) => ({ name: 'Cuti Bersama', date: '2026-12-24', type, description: '' }) as any;

  it('nasional tidak memotong saldo siapa pun', async () => {
    const res: any = await service.createHoliday('t1', dto('NATIONAL'));

    expect(res.holiday).toBeDefined();
    expect(res.collectiveDeduction).toEqual({ deducted: 0, skipped: 0 });
    expect(mockPrisma.leaveBalance.update).not.toHaveBeenCalled();
  });

  it('COLLECTIVE memotong 1 hari yang punya saldo, melewatkan yang tidak', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue({ id: 'lt-al' });
    mockPrisma.employee.findMany.mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]);
    mockPrisma.leaveBalance.findUnique.mockImplementation(({ where }: any) =>
      where.employeeId_leaveTypeId_year.employeeId === 'e1'
        ? Promise.resolve({ id: 'b1' })
        : Promise.resolve(null),
    );
    mockPrisma.leaveBalance.update.mockResolvedValue({});

    const res: any = await service.createHoliday('t1', dto('COLLECTIVE'));

    expect(res.collectiveDeduction).toEqual({ deducted: 1, skipped: 1 });
    expect(mockPrisma.leaveBalance.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'b1' }, data: { totalUsed: { increment: 1 } } }),
    );
  });
});
