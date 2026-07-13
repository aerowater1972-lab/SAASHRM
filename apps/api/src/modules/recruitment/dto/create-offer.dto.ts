import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsDateString, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateOfferDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  allowance?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  benefitDescription?: string;
  @ApiProperty()
  @IsDateString()
  joinDate!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
