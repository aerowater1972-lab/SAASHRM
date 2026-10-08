import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';

export class CreateMovementRequestDto {
  @ApiProperty({ description: 'Employee ID', example: 'uuid' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ description: 'Movement type: promotion, transfer, mutation' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: 'New position ID', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  newPositionId?: string;

  @ApiPropertyOptional({ description: 'New department ID', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  newDepartmentId?: string;

  @ApiPropertyOptional({ description: 'New organization ID', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  newOrganizationId?: string;

  @ApiProperty({ description: 'Effective date (ISO string)', example: '2026-01-01' })
  @IsDateString()
  effectiveDate!: string;

  @ApiPropertyOptional({ description: 'Performance review reference ID', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  performanceReviewRefId?: string;
}