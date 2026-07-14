import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { CycleStatus, Prisma } from '@prisma/client';
import { FinalizeCalibrationDto } from '../dto/finalize-calibration.dto';

@Injectable()
export class CalibrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(tenantId: string, createdBy: string, dto: { reviewCycleId: string; departmentId: string; facilitatorId: string; status?: string }) {
    return this.prisma.calibrationSession.create({
      data: {
        reviewCycleId: dto.reviewCycleId,
        departmentId: dto.departmentId,
        facilitatorId: dto.facilitatorId,
        status: dto.status || 'scheduled',
      },
    });
  }

  async findAll(tenantId: string, reviewCycleId?: string) {
    return this.prisma.calibrationSession.findMany({
      where: { ...(reviewCycleId && { reviewCycleId }), cycle: { tenantId } } as Prisma.CalibrationSessionWhereInput,
      include: { cycle: true, department: true, facilitator: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const session = await this.prisma.calibrationSession.findFirst({
      where: { id, cycle: { tenantId } } as Prisma.CalibrationSessionWhereInput,
      include: { cycle: true, department: true, facilitator: true },
    });
    if (!session) throw new NotFoundException('Calibration session not found');
    return session;
  }

  /**
   * Finalize a calibration session.
   * - Persists a FinalScore per employee in the session scope (BR-05 / FR-05).
   * - Publishes `performance.score.finalized` via the Outbox within the same transaction (contract).
   * - Closes the review cycle; BR-01 lock prevents re-finalization once scores exist.
   */
  async finalize(tenantId: string, sessionId: string, dto: FinalizeCalibrationDto) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.calibrationSession.findFirst({
        where: { id: sessionId, cycle: { tenantId } } as Prisma.CalibrationSessionWhereInput,
        include: { cycle: true },
      });
      if (!session) throw new NotFoundException('Calibration session not found');
      if (session.status === 'finalized') {
        throw new BadRequestException('Calibration session already finalized');
      }

      const cycle = session.cycle;

      // BR-01: final scores are immutable once the cycle is closed (finalized previously).
      const existingScores = await tx.finalScore.count({
        where: { reviewCycleId: cycle.id },
      });
      if (existingScores > 0) {
        throw new BadRequestException('Final scores already published for this cycle; locked per BR-01 (use appeal to change)');
      }

      const overrides = new Map((dto.finalScores ?? []).map((o) => [o.employeeId, o]));

      const employees = await tx.employee.findMany({
        where: session.departmentId
          ? { tenantId, employments: { some: { departmentId: session.departmentId } } }
          : { tenantId, performanceReviews: { some: { cycleId: cycle.id } } },
        select: { id: true },
      });

      const finalized: Array<{ employeeId: string; finalRating: number }> = [];

      for (const emp of employees) {
        const override = overrides.get(emp.id);
        let finalRating: number;
        if (override && typeof override.finalRating === 'number') {
          finalRating = override.finalRating;
        } else {
          const review = await tx.performanceReview.findFirst({
            where: { cycleId: cycle.id, employeeId: emp.id, status: 'COMPLETED' },
            orderBy: { submittedAt: 'desc' },
            select: { overallScore: true },
          });
          const score = review?.overallScore;
          finalRating = score && typeof score === 'object' && 'toNumber' in score ? (score as any).toNumber() : (score as number | null) ?? 0;
        }

        const created = await tx.finalScore.upsert({
          where: { employeeId_reviewCycleId: { employeeId: emp.id, reviewCycleId: cycle.id } },
          create: {
            employeeId: emp.id,
            reviewCycleId: cycle.id,
            finalRating,
            calibratedBy: session.facilitatorId,
          },
          update: { finalRating, calibratedBy: session.facilitatorId },
        });

        // FR-05 / contract: publish performance.score.finalized via Outbox in the same transaction.
        await this.eventBus.publishTypedViaOutbox(
          DomainEventType.PERFORMANCE_SCORE_FINALIZED,
          { employeeId: emp.id, reviewCycleId: cycle.id, finalRating, tenantId },
          { aggregateId: created.id, tenantId },
          tx,
        );

        finalized.push({ employeeId: emp.id, finalRating });
      }

      await tx.calibrationSession.update({ where: { id: sessionId }, data: { status: 'finalized' } });
      // BR-01: closing the cycle locks final scores.
      if (cycle.status !== CycleStatus.COMPLETED) {
        await tx.reviewCycle.update({ where: { id: cycle.id }, data: { status: CycleStatus.COMPLETED } });
      }

      return { sessionId, cycleId: cycle.id, finalizedCount: finalized.length, finalized };
    });
  }
}
