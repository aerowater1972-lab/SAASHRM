import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
export class CreateShiftDto {
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty()
  @IsString()
  code!: string;
  @ApiProperty()
  @IsString()
  startTime!: string;
  @ApiProperty()
  @IsString()
  endTime!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  breakStart?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  breakEnd?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  gracePeriodMinutes?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  lateThresholdMinutes?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  earlyLeaveThresholdMinutes?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeBeforeMinutes?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeAfterMinutes?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNightShift?: boolean;
}
