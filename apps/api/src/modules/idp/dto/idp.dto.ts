import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ValidateNested, IsEnum, IsInt, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { IDPStatus, IDPActivityStatus, IDPActivityType } from '@prisma/client';

export class CreateIDPDto {
  @ApiProperty({ description: 'Employee ID for the development plan' })
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional({ description: 'Plan title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Target completion date' })
  @IsOptional()
  @IsString()
  targetDate?: string;
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

  @ApiPropertyOptional({ description: 'Activity type' })
  @IsOptional()
  @IsEnum(IDPActivityType)
  activityType?: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Estimated hours' })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedHours?: number;
}

export class UpdateIDPStatusDto {
  @ApiProperty({ description: 'New status' })
  @IsEnum(IDPStatus)
  status!: string;
}

export class UpdateActivityStatusDto {
  @ApiProperty({ description: 'New activity status' })
  @IsEnum(IDPActivityStatus)
  status!: string;

  @ApiPropertyOptional({ description: 'Completion notes' })
  @IsOptional()
  @IsString()
  completionNotes?: string;
}