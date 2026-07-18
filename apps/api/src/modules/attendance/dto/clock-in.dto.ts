import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsLatitude, IsLongitude, IsDateString } from 'class-validator';
export enum ClockInMethod {
  GPS = 'GPS',
  QR = 'QR',
  FACE = 'FACE',
  FINGERPRINT = 'FINGERPRINT',
  MANUAL = 'MANUAL',
}
export class ClockInDto {
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
