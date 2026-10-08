import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateCalibrationSessionDto {
  @ApiProperty({ description: 'Review cycle ID' })
  @IsUUID()
  reviewCycleId!: string;

  @ApiProperty({ description: 'Department ID' })
  @IsUUID()
  departmentId!: string;

  @ApiProperty({ description: 'Facilitator (employee) ID' })
  @IsUUID()
  facilitatorId!: string;

  @ApiPropertyOptional({ description: 'Status', default: 'scheduled', enum: ['scheduled', 'in_progress', 'finalized'] })
  @IsOptional()
  @IsString()
  status?: 'scheduled' | 'in_progress' | 'finalized';
}