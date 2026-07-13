import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WorkflowStepDto {
  @IsInt()
  @Min(1)
  stepOrder!: number;

  @IsString()
  @IsNotEmpty()
  approverRole!: string;

  @IsOptional()
  condition?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  slaHours?: number;
}

export class CreateWorkflowDefinitionDto {
  @IsIn(['leave_approval', 'payroll_approval', 'movement_approval', 'expense_approval', 'loan_approval'])
  processType!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps!: WorkflowStepDto[];
}
