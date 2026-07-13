import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsArray, IsEnum } from 'class-validator';
export enum PayrollRunStatus {
  DRAFT = 'DRAFT',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}
export class CreateRunDto {
  @ApiProperty()
  @IsUUID()
  periodId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  employeeIds?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
