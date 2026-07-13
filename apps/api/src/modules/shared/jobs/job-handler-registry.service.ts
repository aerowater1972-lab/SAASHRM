import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from './job-handler.interface';

@Injectable()
export class JobHandlerRegistry {
  private readonly logger = new Logger(JobHandlerRegistry.name);
  private handlers = new Map<string, JobHandler[]>();

  register(handler: JobHandler): void {
    const key = this.key(handler.queue, handler.name);
    const existing = this.handlers.get(key) || [];
    existing.push(handler);
    this.handlers.set(key, existing);
    this.logger.log(`Handler registered: ${key} (${existing.length})`);
  }

  get(queue: string, name: string): JobHandler[] {
    return this.handlers.get(this.key(queue, name)) || [];
  }

  getAll(queue?: string): JobHandler[] {
    const all = Array.from(this.handlers.values()).flat();
    if (queue) return all.filter((h) => h.queue === queue);
    return all;
  }

  private key(queue: string, name: string): string {
    return `${queue}:${name}`;
  }
}
