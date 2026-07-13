import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  IsUUID,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
export enum TaxMethod {
  TER = 'TER',
  PROGRESSIVE = 'PROGRESSIVE',
}
export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  MARRIED_WITH_CHILDREN = 'MARRIED_WITH_CHILDREN',
  DIVORCED = 'DIVORCED',
}
export class CreateTaxConfigDto {
  @ApiProperty()
  @IsEnum(TaxMethod)
  taxMethod!: TaxMethod;
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  ptkp!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}
export class TaxBracketDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minIncome!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxIncome?: number;
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rate!: number;
}
export class TaxCalculationDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;
  @ApiProperty()
  @IsUUID()
  periodId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  grossIncome?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bpjsDeduction?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  otherDeductions?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taxConfigId?: string;
}
