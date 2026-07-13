import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
export class CreateLoanDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount!: number;
  @ApiProperty()
  @IsNumber()
  @Min(1)
  installmentCount!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDeductionFrom?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
