import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { CreateRosterDto } from '../dto/create-roster.dto';
import { RosterEntryDto } from '../dto/roster-entry.dto';
import { ShiftSwapDto } from '../dto/shift-swap.dto';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { RosterEntryStatus, Prisma } from '@prisma/client';

@Injectable()
export class ShiftService {
  constructor(private readonly prisma: PrismaService) {}

  async createShift(tenantId: string, dto: CreateShiftDto) {
    const existing = await this.prisma.shift.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Shift code already exists');
    }

    return this.prisma.shift.create({
      data: { tenantId, ...dto },
    });
  }

  async findAllShifts(tenantId: string) {
    return this.prisma.shift.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOneShift(tenantId: string, id: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  async updateShift(tenantId: string, id: string, dto: Partial<CreateShiftDto>) {
    await this.findOneShift(tenantId, id);

    return this.prisma.shift.update({
      where: { id },
      data: dto,
    });
  }

  async deleteShift(tenantId: string, id: string) {
    await this.findOneShift(tenantId, id);

    return this.prisma.shift.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' as any },
    });
  }

  async createRoster(tenantId: string, dto: CreateRosterDto) {
    return this.prisma.roster.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        rotationPattern: dto.rotationPattern,
      },
    });
  }

  async findAllRosters(tenantId: string) {
    return this.prisma.roster.findMany({
      where: { tenantId, deletedAt: null },
      include: { _count: { select: { entries: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneRoster(tenantId: string, id: string) {
    const roster = await this.prisma.roster.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        entries: {
          include: {
            employee: { select: { id: true, employeeId: true, fullName: true } },
            shift: true,
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!roster) {
      throw new NotFoundException('Roster not found');
    }

    return roster;
  }

  async addRosterEntries(tenantId: string, rosterId: string, dto: RosterEntryDto) {
    await this.findOneRoster(tenantId, rosterId);

    const created: any[] = [];

    for (const entry of dto.entries) {
      const date = new Date(entry.date);
      date.setHours(0, 0, 0, 0);

      try {
        const record = await this.prisma.rosterEntry.create({
          data: {
            rosterId,
            employeeId: entry.employeeId,
            shiftId: entry.shiftId,
            date,
          },
          include: {
            employee: { select: { id: true, employeeId: true, fullName: true } },
            shift: true,
          },
        });
        created.push(record);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ConflictException(`Entry already exists for employee ${entry.employeeId} on ${entry.date}`);
        }
        throw err;
      }
    }

    return created;
  }

  async requestShiftSwap(tenantId: string, rosterEntryId: string, employeeId: string, dto: ShiftSwapDto) {
    const entry = await this.prisma.rosterEntry.findFirst({
      where: { id: rosterEntryId, employeeId, status: RosterEntryStatus.SCHEDULED },
    });

    if (!entry) {
      throw new NotFoundException('Roster entry not found or already modified');
    }

    const targetEntry = await this.prisma.rosterEntry.findUnique({
      where: { employeeId_date: { employeeId: dto.targetEmployeeId, date: entry.date } },
    });

    if (!targetEntry) {
      throw new BadRequestException('Target employee has no shift scheduled on this date');
    }

    await this.prisma.rosterEntry.update({
      where: { id: entry.id },
      data: { status: RosterEntryStatus.SWAP_REQUESTED },
    });

    return this.prisma.rosterEntry.update({
      where: { id: targetEntry.id },
      data: { status: RosterEntryStatus.SWAP_REQUESTED },
    });
  }

  async createHoliday(tenantId: string, dto: CreateHolidayDto) {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    const existing = await this.prisma.holidayCalendar.findUnique({
      where: { tenantId_date_entityId: { tenantId, date, entityId: dto.entityId || '00000000-0000-0000-0000-000000000000' } },
    });

    if (existing) {
      throw new ConflictException('Holiday already exists for this date');
    }

    const created = await this.prisma.holidayCalendar.create({
      data: {
        tenantId,
        name: dto.name,
        date,
        type: dto.type,
        isRecurring: dto.isRecurring ?? false,
        description: dto.description,
        entityId: dto.entityId,
      },
    });

    // SKB cuti bersama = bagian dari cuti tahunan: potong 1 hari dari
    // saldo cuti tahunan (kode AL) tiap karyawan aktif. Tanpa baris saldo
    // -> dilewati dan dilaporkan (tidak dibuatkan diam-diam).
    let deducted = 0;
    let skipped = 0;
    if ((dto.type as string) === 'COLLECTIVE') {
      const annualType = await this.prisma.leaveType.findFirst({
        where: { tenantId, code: 'AL', isActive: true },
      });
      if (annualType) {
        const year = date.getFullYear();
        const employees = await this.prisma.employee.findMany({
          where: { tenantId, deletedAt: null, status: 'ACTIVE' as any },
          select: { id: true },
        });
        for (const emp of employees) {
          const balance = await this.prisma.leaveBalance.findUnique({
            where: {
              employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: annualType.id, year },
            },
          });
          if (!balance) {
            skipped++;
            continue;
          }
          await this.prisma.leaveBalance.update({
            where: { id: balance.id },
            data: { totalUsed: { increment: 1 } },
          });
          deducted++;
        }
      }
    }

    return { holiday: created, collectiveDeduction: { deducted, skipped } };
  }

  async findHolidays(tenantId: string, year?: number, entityId?: string) {
    const where: Prisma.HolidayCalendarWhereInput = { tenantId };

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      where.date = { gte: startOfYear, lte: endOfYear };
    }

    if (entityId) {
      where.entityId = entityId;
    }

    return this.prisma.holidayCalendar.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }
}
