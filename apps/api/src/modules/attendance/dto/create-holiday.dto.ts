import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { HolidayType } from '@prisma/client';
export class CreateHolidayDto {
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty()
  @IsDateString()
  date!: string;
  @ApiPropertyOptional({ enum: HolidayType })
  @IsOptional()
  @IsEnum(HolidayType)
  type?: HolidayType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;
}
