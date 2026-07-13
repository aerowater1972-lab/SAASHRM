import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Gender } from '@prisma/client';
export class CreateLeaveTypeDto {
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty()
  @IsString()
  code!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowNegativeBalance?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConsecutiveDays?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresDocument?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  carryForwardLimit?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carryForwardExpiry?: string;
  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  genderRestriction?: Gender;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minServiceMonths?: number;
}
