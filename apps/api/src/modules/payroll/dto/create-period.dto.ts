import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
export enum PeriodStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  LOCKED = 'LOCKED',
}
export enum PeriodType {
  MONTHLY = 'MONTHLY',
  BIWEEKLY = 'BIWEEKLY',
  WEEKLY = 'WEEKLY',
}
export class CreatePeriodDto {
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty({ enum: PeriodType })
  @IsEnum(PeriodType)
  type!: PeriodType;
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
  @ApiProperty()
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;
  @ApiProperty()
  @IsDateString()
  startDate!: string;
  @ApiProperty()
  @IsDateString()
  endDate!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string;
  @ApiPropertyOptional({ enum: PeriodStatus })
  @IsOptional()
  @IsEnum(PeriodStatus)
  status?: PeriodStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
