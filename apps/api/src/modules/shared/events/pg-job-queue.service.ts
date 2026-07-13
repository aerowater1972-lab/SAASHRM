import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { JobStatus } from '@prisma/client';

@Injectable()
export class PgJobQueueService {
  private readonly logger = new Logger(PgJobQueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  async add(
    queue: string,
    name: string,
    payload: Record<string, any>,
    opts?: { priority?: number; maxRetries?: number; scheduledAt?: Date },
  ): Promise<void> {
    await this.prisma.jobQueue.create({
      data: {
        queue,
        name,
        payload,
        priority: opts?.priority ?? 0,
        maxRetries: opts?.maxRetries ?? 3,
        scheduledAt: opts?.scheduledAt ?? new Date(),
      },
    });
    this.logger.debug(`Job ${name} added to queue ${queue}`);
  }

  async addMany(
    queue: string,
    jobs: { name: string; payload: Record<string, any>; opts?: { priority?: number; maxRetries?: number; scheduledAt?: Date } }[],
  ): Promise<void> {
    await this.prisma.jobQueue.createMany({
      data: jobs.map((job) => ({
        queue,
        name: job.name,
        payload: job.payload,
        priority: job.opts?.priority ?? 0,
        maxRetries: job.opts?.maxRetries ?? 3,
        scheduledAt: job.opts?.scheduledAt ?? new Date(),
      })),
    });
  }

  async processNext(queue: string): Promise<void> {
    const job = await this.prisma.jobQueue.findFirst({
      where: {
        queue,
        status: JobStatus.PENDING,
        scheduledAt: { lte: new Date() },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    if (!job) return;

    await this.prisma.jobQueue.update({
      where: { id: job.id },
      data: { status: JobStatus.PROCESSING, processedAt: new Date() },
    });

    try {
      this.logger.log(`Processing job ${job.name} from queue ${queue}`);
      await this.prisma.jobQueue.update({
        where: { id: job.id },
        data: { status: JobStatus.COMPLETED },
      });
    } catch (error) {
      const retries = job.retries + 1;
      const status = retries >= job.maxRetries ? JobStatus.FAILED : JobStatus.PENDING;
      await this.prisma.jobQueue.update({
        where: { id: job.id },
        data: { status, retries, errorMsg: (error as Error).message },
      });
      this.logger.error(`Job ${job.name} failed (${retries}/${job.maxRetries}): ${(error as Error).message}`);
    }
  }

  async processAll(queue: string): Promise<void> {
    let processed = 0;
    let hasMore = true;
    while (hasMore) {
      const job = await this.prisma.jobQueue.findFirst({
        where: {
          queue,
          status: JobStatus.PENDING,
          scheduledAt: { lte: new Date() },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
      if (!job) break;
      processed++;
      await this.processNext(queue);
    }
    if (processed > 0) {
      this.logger.log(`Processed ${processed} jobs from queue ${queue}`);
    }
  }

  async getPendingCount(queue: string): Promise<number> {
    return this.prisma.jobQueue.count({
      where: { queue, status: JobStatus.PENDING },
    });
  }

  async purgeQueue(queue: string): Promise<void> {
    await this.prisma.jobQueue.deleteMany({
      where: {
        queue,
        status: { in: [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED] },
      },
    });
  }
}
