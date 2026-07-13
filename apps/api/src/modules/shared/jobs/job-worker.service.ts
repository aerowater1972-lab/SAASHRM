import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { JobStatus } from '@prisma/client';
import { JobHandlerRegistry } from './job-handler-registry.service';
import { Job } from './job-handler.interface';

@Injectable()
export class JobWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobWorkerService.name);
  private polling = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;
  private readonly queues: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: JobHandlerRegistry,
    configService: ConfigService,
  ) {
    this.intervalMs = configService.get<number>('JOB_WORKER_INTERVAL_MS', 5000);
    this.queues = ['events'];
  }

  async onModuleInit(): Promise<void> {
    const enabled = process.env.JOB_WORKER_ENABLED ?? 'true';
    if (enabled === 'false') {
      this.logger.log('Job worker disabled via JOB_WORKER_ENABLED=false');
      return;
    }
    this.polling = true;
    this.logger.log(`Job worker started (polling every ${this.intervalMs}ms, queues: ${this.queues.join(', ')})`);
    await this.poll();
  }

  async onModuleDestroy(): Promise<void> {
    this.polling = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.log('Job worker stopped');
  }

  private async poll(): Promise<void> {
    if (!this.polling) return;

    for (const queue of this.queues) {
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

        await this.processJob(job as unknown as Job, queue);
        processed++;
      }

      if (processed > 0) {
        this.logger.log(`Processed ${processed} job(s) from queue ${queue}`);
      }
    }

    this.timer = setTimeout(() => this.poll(), this.intervalMs);
  }

  private async processJob(job: Job, queue: string): Promise<void> {
    await this.prisma.jobQueue.update({
      where: { id: job.id },
      data: { status: JobStatus.PROCESSING, processedAt: new Date() },
    });

    try {
      const handlers = this.registry.get(queue, job.name);
      const wildcardHandlers = this.registry.get(queue, '*');
      const allHandlers = [...handlers, ...wildcardHandlers];

      for (const handler of allHandlers) {
        await handler.handle(job);
      }

      await this.prisma.jobQueue.update({
        where: { id: job.id },
        data: { status: JobStatus.COMPLETED },
      });

      this.logger.debug(`Job ${job.name} (${job.id}) completed`);
    } catch (error) {
      const retries = job.retries + 1;
      const status = retries >= job.maxRetries ? JobStatus.FAILED : JobStatus.PENDING;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.jobQueue.update({
        where: { id: job.id },
        data: { status, retries, errorMsg },
      });

      this.logger.error(`Job ${job.name} (${job.id}) failed (${retries}/${job.maxRetries}): ${errorMsg}`);
    }
  }
}
