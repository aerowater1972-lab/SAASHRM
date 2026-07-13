import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
export class AttendanceCorrectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  clockIn?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  clockOut?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
  @ApiProperty()
  @IsString()
  reason!: string;
}
