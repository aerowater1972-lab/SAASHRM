import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, IsArray, ValidateNested, IsUUID, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ManpowerPlanStatus, ManpowerType } from '@prisma/client';

export class ManpowerPlanItemDto {
  @ApiProperty({ description: 'Position title' })
  @IsString()
  @MinLength(1)
  positionTitle!: string;

  @ApiPropertyOptional({ description: 'Grade ID (references grade master data)' })
  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @ApiProperty({ default: 1, minimum: 1, description: 'Number of headcount needed' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number = 1;

  @ApiProperty({ enum: ManpowerType, default: ManpowerType.NEW, description: 'Type: NEW position or REPLACEMENT' })
  @IsEnum(ManpowerType)
  type: ManpowerType = ManpowerType.NEW;

  @ApiPropertyOptional({ description: 'Estimated annual cost for this position' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedCost?: number;
}

export class CreateManpowerPlanDto {
  @ApiProperty({ description: 'Department ID' })
  @IsUUID()
  departmentId!: string;

  @ApiProperty({ description: 'Planning period (e.g., "2026-H1", "2026-Q3")' })
  @IsString()
  @MinLength(1)
  period!: string;

  @ApiProperty({ type: [ManpowerPlanItemDto], description: 'Planned positions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManpowerPlanItemDto)
  items!: ManpowerPlanItemDto[];
}

export class UpdateManpowerPlanDto {
  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Planning period' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({ type: [ManpowerPlanItemDto], description: 'Planned positions' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManpowerPlanItemDto)
  items?: ManpowerPlanItemDto[];

  @ApiPropertyOptional({ description: 'Plan status', enum: ManpowerPlanStatus })
  @IsOptional()
  @IsEnum(ManpowerPlanStatus)
  status?: ManpowerPlanStatus;
}

export class ApproveManpowerPlanDto {
  @ApiProperty({ description: 'Action: approve or reject' })
  @IsEnum(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({ description: 'Rejection reason (required if action=REJECT)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class LinkRequisitionToPlanDto {
  @ApiProperty({ description: 'Manpower plan item ID to link' })
  @IsUUID()
  manpowerPlanItemId!: string;

  @ApiProperty({ description: 'Requisition ID to link' })
  @IsUUID()
  requisitionId!: string;
}

export class ManpowerPlanFilterDto {
  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by planning period' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(['DRAFT', 'SUBMITTED', 'HR_REVIEW', 'FINANCE_REVIEW', 'APPROVED', 'REJECTED'])
  status?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class PlanVsActualDto {
  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by period' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}