import { Injectable, Logger } from '@nestjs/common';
import { JobHandler, Job } from '../job-handler.interface';

@Injectable()
export class LoggingJobHandler implements JobHandler {
  readonly queue = 'events';
  readonly name = '*';

  private readonly logger = new Logger(LoggingJobHandler.name);

  async handle(job: Job): Promise<void> {
    this.logger.log(`Event: ${job.name} | Aggregate: ${job.payload.aggregateType}#${job.payload.aggregateId}`);
    this.logger.debug(`Payload: ${JSON.stringify(job.payload)}`);
  }
}
