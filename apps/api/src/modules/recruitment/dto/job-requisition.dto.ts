import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateJobRequisitionDto {
  @ApiProperty({ description: 'Requisition title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Department ID' })
  @IsUUID()
  departmentId!: string;

  @ApiPropertyOptional({ description: 'Manpower plan item ID (FR-04)' })
  @IsOptional()
  @IsUUID()
  manpowerPlanItemId?: string;
}