import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class WorkflowStepDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  stepOrder!: number;
  @ApiProperty({ example: 'Manager Approval' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;
  @ApiProperty({ enum: ['DIRECT_MANAGER', 'ROLE', 'SPECIFIC_USER', 'DEPARTMENT_HEAD', 'HR'] })
  @IsString()
  approverType!: 'DIRECT_MANAGER' | 'ROLE' | 'SPECIFIC_USER' | 'DEPARTMENT_HEAD' | 'HR';
  @ApiPropertyOptional({ example: 'role-uuid' })
  @IsOptional()
  @IsString()
  approverRoleId?: string;
  @ApiPropertyOptional({ example: 'user-uuid' })
  @IsOptional()
  @IsString()
  approverUserId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  condition?: Record<string, any>;
  @ApiPropertyOptional({ example: 48 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeoutHours?: number;
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  escalationStep?: number;
}
export class CreateWorkflowDto {
  @ApiProperty({ example: 'LEAVE_APPROVAL' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  code!: string;
  @ApiProperty({ example: 'Leave Request Approval' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;
  @ApiPropertyOptional({ example: 'Workflow for approving leave requests' })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiProperty({ type: [WorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps!: WorkflowStepDto[];
}
