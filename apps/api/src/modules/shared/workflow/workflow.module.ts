import { Global, Module } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { WORKFLOW_DEFINITIONS } from './workflow.definitions';

@Global()
@Module({
  providers: [WorkflowEngineService],
  exports: [WorkflowEngineService],
})
export class WorkflowModule {
  constructor(private readonly engine: WorkflowEngineService) {
    this.engine.registerMany(WORKFLOW_DEFINITIONS);
  }
}
