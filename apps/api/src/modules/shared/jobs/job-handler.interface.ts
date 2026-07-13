import { JobStatus } from '@prisma/client';

export interface Job {
  id: string;
  queue: string;
  name: string;
  payload: Record<string, any>;
  status: JobStatus;
  retries: number;
  maxRetries: number;
  priority: number;
  scheduledAt: Date;
  createdAt: Date;
  tenantId?: string;
}

export interface JobHandler {
  readonly queue: string;
  readonly name: string;
  handle(job: Job): Promise<void>;
}
