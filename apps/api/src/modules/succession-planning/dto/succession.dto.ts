import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import {
  TalentReadiness,
  TalentPoolStatus,
  SuccessionPlanStatus,
} from '@prisma/client';

export class CreateTalentPoolDto {
  @ApiProperty({ description: 'Pool name' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ description: 'Pool description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Selection criteria' })
  @IsOptional()
  @IsString()
  criteria?: string;

  @ApiPropertyOptional({ description: 'Pool status', enum: TalentPoolStatus, default: 'ACTIVE' })
  @IsOptional()
  @IsEnum(TalentPoolStatus)
  status?: TalentPoolStatus;
}

export class UpdateTalentPoolDto {
  @ApiPropertyOptional({ description: 'Pool name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Pool description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Selection criteria' })
  @IsOptional()
  @IsString()
  criteria?: string;

  @ApiPropertyOptional({ description: 'Pool status' })
  @IsOptional()
  @IsEnum(TalentPoolStatus)
  status?: TalentPoolStatus;
}

export class AddPoolMemberDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional({ description: 'Performance band (HIGH/MID/LOW)' })
  @IsOptional()
  @IsString()
  performanceBand?: string;

  @ApiPropertyOptional({ description: 'Potential band (HIGH/MID/LOW)' })
  @IsOptional()
  @IsString()
  potentialBand?: string;

  @ApiPropertyOptional({ description: 'Readiness level' })
  @IsOptional()
  @IsEnum(TalentReadiness)
  readiness?: TalentReadiness;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePoolMemberDto {
  @ApiPropertyOptional({ description: 'Performance band' })
  @IsOptional()
  @IsString()
  performanceBand?: string;

  @ApiPropertyOptional({ description: 'Potential band' })
  @IsOptional()
  @IsString()
  potentialBand?: string;

  @ApiPropertyOptional({ description: 'Readiness level' })
  @IsOptional()
  @IsEnum(TalentReadiness)
  readiness?: TalentReadiness;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSuccessionPlanDto {
  @ApiProperty({ description: 'Position ID being planned for' })
  @IsString()
  positionId!: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Current incumbent employee ID' })
  @IsOptional()
  @IsString()
  currentEmployeeId?: string;

  @ApiPropertyOptional({ description: 'Vacancy risk code (LOW/MEDIUM/HIGH)' })
  @IsOptional()
  @IsString()
  riskCode?: string;

  @ApiPropertyOptional({ description: 'Target ready date (ISO)' })
  @IsOptional()
  @IsString()
  targetReadyDate?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSuccessionPlanDto {
  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Current incumbent employee ID' })
  @IsOptional()
  @IsString()
  currentEmployeeId?: string;

  @ApiPropertyOptional({ description: 'Plan status' })
  @IsOptional()
  @IsEnum(SuccessionPlanStatus)
  status?: SuccessionPlanStatus;

  @ApiPropertyOptional({ description: 'Vacancy risk code' })
  @IsOptional()
  @IsString()
  riskCode?: string;

  @ApiPropertyOptional({ description: 'Target ready date (ISO)' })
  @IsOptional()
  @IsString()
  targetReadyDate?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddSuccessionCandidateDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional({ description: 'Readiness level' })
  @IsOptional()
  @IsEnum(TalentReadiness)
  readiness?: TalentReadiness;

  @ApiPropertyOptional({ description: 'Rank order (1 = top candidate)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rank?: number;

  @ApiPropertyOptional({ description: 'Assessment notes' })
  @IsOptional()
  @IsString()
  assessmentNotes?: string;

  @ApiPropertyOptional({ description: 'Decision (PROMOTED/PENDING/NOT_SELECTED)' })
  @IsOptional()
  @IsString()
  decision?: string;
}

export class UpdateSuccessionCandidateDto {
  @ApiPropertyOptional({ description: 'Readiness level' })
  @IsOptional()
  @IsEnum(TalentReadiness)
  readiness?: TalentReadiness;

  @ApiPropertyOptional({ description: 'Rank order' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rank?: number;

  @ApiPropertyOptional({ description: 'Assessment notes' })
  @IsOptional()
  @IsString()
  assessmentNotes?: string;

  @ApiPropertyOptional({ description: 'Decision' })
  @IsOptional()
  @IsString()
  decision?: string;
}

export class RemoveMembersDto {
  @ApiProperty({ description: 'Employee IDs to remove' })
  @IsArray()
  @IsString({ each: true })
  employeeIds!: string[];
}