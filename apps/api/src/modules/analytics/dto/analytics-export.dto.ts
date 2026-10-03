import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AnalyticsFilterDto } from './analytics-filter.dto';

export class AnalyticsExportDto {
  @ApiProperty({ enum: ['headcount', 'turnover', 'workforce-cost', 'bradford', 'flight-risk', 'leave', 'overtime', 'gender-pay-gap', 'lk-kphpp'] })
  @IsIn(['headcount', 'turnover', 'workforce-cost', 'bradford', 'flight-risk', 'leave', 'overtime', 'gender-pay-gap', 'lk-kphpp'])
  report!: string;

  @ApiPropertyOptional({ enum: ['csv', 'pdf'], default: 'csv' })
  @IsOptional()
  @IsString()
  @IsIn(['csv', 'pdf'])
  format?: string;

  @ApiPropertyOptional({ description: 'Filters applied to the report' })
  @IsOptional()
  filters?: AnalyticsFilterDto;
}
