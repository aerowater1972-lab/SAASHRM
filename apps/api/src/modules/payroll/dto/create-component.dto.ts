import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
export enum ComponentType {
  EARNING = 'EARNING',
  DEDUCTION = 'DEDUCTION',
}
export enum ComponentCategory {
  FIXED = 'FIXED',
  VARIABLE = 'VARIABLE',
  ONE_TIME = 'ONE_TIME',
}
export enum ComponentCalculationMethod {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
  FORMULA = 'FORMULA',
}
export class CreateComponentDto {
  @ApiProperty()
  @IsString()
  code!: string;
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty({ enum: ComponentType })
  @IsEnum(ComponentType)
  type!: ComponentType;
  @ApiPropertyOptional({ enum: ComponentCategory })
  @IsOptional()
  @IsEnum(ComponentCategory)
  category?: ComponentCategory;
  @ApiProperty({ enum: ComponentCalculationMethod })
  @IsEnum(ComponentCalculationMethod)
  calculationMethod!: ComponentCalculationMethod;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  defaultValue?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  percentage?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formula?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxCap?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isProrated?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
