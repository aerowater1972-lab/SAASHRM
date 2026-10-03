import {
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';

@Injectable()
export class ShiftRotationService {
  private readonly logger = new Logger(ShiftRotationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    @Optional() private readonly config?: any,
  ) {}

  /**
   * Generate roster entries for a date range based on shift group rotation
   * Rotates employees through shifts 1, 2, 3 in their shift group
   */
  async generateRosterFromRotation(
    tenantId: string,
    shiftGroupId: string,
    startDate: Date,
    endDate: Date,
    rosterId?: string,
  ) {
    // Get active shifts in the group, ordered by creation date (used as order)
    const groupShifts = await this.prisma.shift.findMany({
      where: {
        tenantId,
        shiftGroupId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, code: true },
    });

    if (groupShifts.length < 2) {
      this.logger.warn(`Shift group ${shiftGroupId} has less than 2 active shifts, skipping rotation`);
      return { created: 0, message: 'Insufficient shifts for rotation' };
    }

    // Get employees in this shift group (tenant-scoped via ShiftGroup relation;
    // Employment has no tenantId column)
    const employees = await this.prisma.employment.findMany({
      where: {
        shiftGroupId,
        shiftGroup: { tenantId },
        isActive: true,
        employee: { deletedAt: null, status: 'ACTIVE' as any },
      },
      select: {
        employeeId: true,
        employee: {
          select: { id: true, employeeId: true, fullName: true },
        },
      },
    });

    if (employees.length === 0) {
      this.logger.warn(`No active employees in shift group ${shiftGroupId}`);
      return { created: 0, message: 'No employees in shift group' };
    }

    // Get or create roster
    let roster;
    if (rosterId) {
      roster = await this.prisma.roster.findFirst({
        where: { id: rosterId, tenantId, deletedAt: null },
      });
      if (!roster) throw new Error('Roster not found');
    } else {
      // Create or find existing roster for the period
      roster = await this.prisma.roster.findFirst({
        where: {
          tenantId,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
          deletedAt: null,
        },
      });
      if (!roster) {
        roster = await this.prisma.roster.create({
          data: {
            tenantId,
            name: `Auto Rotation ${new Date().toISOString().slice(0, 10)}`,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 86400000), // 30 days
            status: 'ACTIVE' as any,
          },
        });
      }
    }

    // Simple round-robin rotation: distribute employees across shifts cyclically
    const employeeCount = employees.length;
    const created: any[] = [];
    const errors: any[] = [];

    const currentDate = new Date();
    const windowEnd = new Date();
    windowEnd.setDate(windowEnd.getDate() + 7); // Generate for 1 week ahead

    for (let date = new Date(currentDate); date <= windowEnd; date.setDate(date.getDate() + 1)) {
      const dayIndex = date.getDay(); // 0 = Sunday, 6 = Saturday

      // Skip weekends for now (customizable later)
      if (dayIndex === 0 || dayIndex === 6) continue;

      // For each employee, assign a shift based on rotation
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        const shiftIndex = (i + Math.floor((date.getTime() - new Date().getTime()) / 86400000)) % groupShifts.length;
        const shift = groupShifts[shiftIndex];

        try {
          const entry = await this.prisma.rosterEntry.upsert({
            where: {
              employeeId_date: {
                employeeId: emp.employeeId,
                date: new Date(date.setHours(0, 0, 0, 0)),
              },
            },
            create: {
              rosterId: roster.id,
              employeeId: emp.employeeId,
              shiftId: shift.id,
              date: new Date(date.setHours(0, 0, 0, 0)),
              status: 'SCHEDULED' as any,
            },
            update: {
              shiftId: shift.id,
              status: 'SCHEDULED' as any,
            },
          });
          created.push(entry);
        } catch (err) {
          errors.push({ employeeId: emp.employeeId, date: new Date(date), error: (err as Error).message });
        }
      }
    }

    return {
      created: created.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Run daily rotation check - call via cron
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyRotation() {
    this.logger.log('Starting daily shift rotation check');

    const tenantIds = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });

    for (const tenant of tenantIds) {
      try {
        const shiftGroups = await this.prisma.shiftGroup.findMany({
          where: { tenantId: tenant.id, isActive: true, deletedAt: null },
          select: { id: true },
        });

        for (const group of shiftGroups) {
          // Generate roster for next 7 days
          await this.generateRosterFromRotation(
            tenant.id,
            group.id,
            new Date(),
            new Date(Date.now() + 7 * 86400000),
          );
        }
      } catch (err) {
        this.logger.error(`Rotation failed for tenant ${tenant.id}: ${(err as Error).message}`);
      }
    }

    this.logger.log('Daily shift rotation check completed');
  }

  /**
   * Manually trigger rotation for a specific group
   */
  async triggerRotation(tenantId: string, shiftGroupId: string, daysAhead = 7) {
    const result = await this.generateRosterFromRotation(
      tenantId,
      shiftGroupId,
      new Date(),
      new Date(Date.now() + daysAhead * 86400000),
    );
    return result;
  }

  /**
   * Get current shift assignment for an employee on a date
   */
  async getEmployeeShiftOnDate(tenantId: string, employeeId: string, date: Date) {
    const entry = await this.prisma.rosterEntry.findFirst({
      where: {
        employeeId,
        date: new Date(date.setHours(0, 0, 0, 0)),
        roster: { tenantId },
      },
      include: { shift: true },
    });
    return entry?.shift || null;
  }

  /**
   * Get rotation schedule for a shift group for a date range
   */
  async getRotationSchedule(tenantId: string, shiftGroupId: string, startDate: Date, endDate: Date) {
    const groupShifts = await this.prisma.shift.findMany({
      where: { tenantId, shiftGroupId, status: 'ACTIVE', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, code: true },
    });

    const employees = await this.prisma.employment.findMany({
      where: {
        shiftGroupId,
        shiftGroup: { tenantId },
        isActive: true,
        employee: { deletedAt: null, status: 'ACTIVE' as any },
      },
      select: { employeeId: true, employee: { select: { id: true, employeeId: true, fullName: true } } },
    });

    // This is a simplified version - in reality you'd query the roster entries
    return { shifts: groupShifts, employees: employees.map((e) => e.employee) };
  }
}