import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
class BenefitComponentDto {
  @ApiProperty()
  @IsString()
  payrollComponentId!: string;
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;
}
export class EnrollBenefitDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;
  @ApiProperty()
  @IsString()
  benefitId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
  @ApiPropertyOptional({ type: [BenefitComponentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenefitComponentDto)
  components?: BenefitComponentDto[];
}
