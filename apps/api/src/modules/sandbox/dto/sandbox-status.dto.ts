import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsOptional, IsNumber, IsIn } from 'class-validator';

export const SANDBOX_STATUSES = ['provisioning', 'active', 'cleanup', 'error'];
export type SandboxStatusValue = (typeof SANDBOX_STATUSES)[number];

export class SandboxStatus {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  id!: string;

  @ApiProperty({ enum: SANDBOX_STATUSES })
  @IsIn(SANDBOX_STATUSES)
  status!: SandboxStatusValue;

  @ApiProperty({ example: '2026-10-13T10:00:00.000Z' })
  @IsDate()
  createdAt!: Date;

  @ApiProperty({ required: false, type: Date })
  @IsDate()
  @IsOptional()
  updatedAt?: Date;

  @ApiProperty({ required: false, type: Number })
  @IsNumber()
  @IsOptional()
  recordsCreated?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sampleType?: string;
}
