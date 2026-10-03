import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { ProvincialMinimumWage } from '@prisma/client';

export class CreateWageDto {
  @ApiProperty({ description: 'Province name' })
  @IsString()
  province!: string;

  @ApiProperty({ description: 'Year' })
  @IsInt()
  @Min(2020)
  year!: number;

  @ApiProperty({ description: 'Minimum wage amount (IDR)' })
  @IsInt()
  @Min(0)
  amount!: number;
}

export class UpdateWageDto {
  @ApiPropertyOptional({ description: 'Minimum wage amount' })
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;
}

export class WageCalculationQueryDto {
  @ApiPropertyOptional({ description: 'Province' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Year' })
  @IsOptional()
  @IsInt()
  @Min(2020)
  year?: number;
}