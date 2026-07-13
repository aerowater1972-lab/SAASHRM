import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
export enum BenefitType {
  ALLOWANCE = 'ALLOWANCE',
  INSURANCE = 'INSURANCE',
  FACILITY = 'FACILITY',
  OTHER = 'OTHER',
}
export enum BenefitFrequency {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  ONE_TIME = 'ONE_TIME',
}
export class CreateBenefitDto {
  @ApiProperty({ description: 'Unique benefit code' })
  @IsString()
  code!: string;
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty({ enum: BenefitType })
  @IsEnum(BenefitType)
  type!: BenefitType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;
  @ApiPropertyOptional({ enum: BenefitFrequency })
  @IsOptional()
  @IsEnum(BenefitFrequency)
  frequency?: BenefitFrequency;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
