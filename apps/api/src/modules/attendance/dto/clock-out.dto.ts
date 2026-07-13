import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString } from 'class-validator';
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
