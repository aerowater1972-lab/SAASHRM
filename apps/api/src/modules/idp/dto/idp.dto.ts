import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ValidateNested, IsEnum, IsInt, Min, Max, MinLength, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { IDPStatus, IDPActivityStatus, IDPActivityType } from '@prisma/client';

export class CreateIDPDto {
  @ApiProperty({ description: 'Employee ID for the development plan' })
  @IsNotEmpty()
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional({ description: 'Review cycle ID' })
  @IsOptional()
  @IsString()
  reviewCycleId?: string;

  @ApiPropertyOptional({ description: 'Plan title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Skills gap analysis' })
  @IsOptional()
  @IsString()
  skillsGap?: string;

  @ApiPropertyOptional({ description: 'Objectives as JSON array' })
  @IsOptional()
  @IsString()
  objectives?: string;

  @ApiPropertyOptional({ description: 'Target completion date' })
  @IsOptional()
  @IsString()
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO)' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class UpdateIDPDto {
  @ApiPropertyOptional({ description: 'Plan title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Skills gap analysis' })
  @IsOptional()
  @IsString()
  skillsGap?: string;

  @ApiPropertyOptional({ description: 'Objectives as JSON array' })
  @IsOptional()
  @IsString()
  objectives?: string;

  @ApiPropertyOptional({ description: 'Target completion date' })
  @IsOptional()
  @IsString()
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO)' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class UpdateIDPStatusDto {
  @ApiProperty({ description: 'New status', enum: IDPStatus })
  @IsEnum(IDPStatus)
  status!: IDPStatus;
}

export class AddIDPActivityDto {
  @ApiProperty({ description: 'Activity title' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ description: 'Activity description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Activity type', enum: IDPActivityType })
  @IsOptional()
  @IsEnum(IDPActivityType)
  activityType?: IDPActivityType;

  @ApiPropertyOptional({ description: 'Due date (ISO)' })
  @IsOptional()
  @IsString()
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Estimated hours' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimatedHours?: number;
}

export class UpdateActivityStatusDto {
  @ApiProperty({ description: 'New activity status', enum: IDPActivityStatus })
  @IsEnum(IDPActivityStatus)
  status!: IDPActivityStatus;

  @ApiPropertyOptional({ description: 'Progress percentage (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ description: 'Completion notes' })
  @IsOptional()
  @IsString()
  completionNotes?: string;
}