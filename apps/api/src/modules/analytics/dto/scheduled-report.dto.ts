import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AnalyticsFilterDto } from './analytics-filter.dto';

export const SCHEDULED_REPORT_TYPES = [
  'headcount',
  'turnover',
  'workforce-cost',
  'bradford',
  'flight-risk',
  'leave',
  'overtime',
  'gender-pay-gap',
  'lk-kphpp',
] as const;

export class CreateScheduledReportDto {
  @ApiProperty({ example: 'Headcount Harian' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: SCHEDULED_REPORT_TYPES })
  @IsIn(SCHEDULED_REPORT_TYPES as unknown as string[])
  report!: string;

  @ApiPropertyOptional({ enum: ['csv', 'pdf'], default: 'csv' })
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  format?: string;

  @ApiPropertyOptional({ enum: ['DAILY', 'WEEKLY', 'MONTHLY'], default: 'DAILY' })
  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  frequency?: string;

  @ApiPropertyOptional({ default: 7, minimum: 0, maximum: 23, description: 'Jam kirim (waktu server)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hour?: number;

  @ApiPropertyOptional({ description: '0=Minggu..6=Sabtu (WAJIB untuk WEEKLY)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: '1-28 (WAJIB untuk MONTHLY)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @ApiProperty({ type: [String], example: ['hr@company.com'] })
  @IsArray()
  @IsEmail({}, { each: true })
  recipients!: string[];

  @ApiPropertyOptional({ type: AnalyticsFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AnalyticsFilterDto)
  filters?: AnalyticsFilterDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateScheduledReportDto extends PartialType(CreateScheduledReportDto) {}
