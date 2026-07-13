import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsLatitude, IsLongitude } from 'class-validator';
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
  @ApiProperty({ enum: ClockInMethod })
  @IsEnum(ClockInMethod)
  method!: ClockInMethod;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
