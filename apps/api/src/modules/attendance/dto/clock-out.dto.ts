import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString } from 'class-validator';
import { ClockInMethod } from './clock-in.dto';
export class ClockOutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  @IsNumber()
  latitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  @IsNumber()
  longitude?: number;
  @ApiPropertyOptional({ description: 'GPS accuracy in meters reported by the client (anti-spoof)' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;
  @ApiPropertyOptional({ description: 'Client-side capture timestamp (ISO8601) for time-travel detection' })
  @IsOptional()
  @IsDateString()
  clientTimestamp?: string;
  @ApiProperty({ enum: ClockInMethod })
  @IsEnum(ClockInMethod)
  method!: ClockInMethod;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;
  @ApiPropertyOptional({ description: 'Probe face embedding (required when method=FACE)' })
  @IsOptional()
  embedding?: number[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
