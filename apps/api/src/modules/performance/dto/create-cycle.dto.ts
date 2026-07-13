import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ReviewCycleType } from '@prisma/client';
export class CreateCycleDto {
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty()
  @IsString()
  period!: string;
  @ApiProperty()
  @IsDateString()
  startDate!: string;
  @ApiProperty()
  @IsDateString()
  endDate!: string;
  @ApiPropertyOptional({ enum: ReviewCycleType })
  @IsOptional()
  @IsEnum(ReviewCycleType)
  type?: ReviewCycleType;
}
