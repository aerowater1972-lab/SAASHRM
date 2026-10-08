import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertFinalSettlementDto {
  @ApiPropertyOptional({ description: 'Unused leave payout amount', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unusedLeavePayout?: number;

  @ApiPropertyOptional({ description: 'Severance amount', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  severanceAmount?: number;

  @ApiPropertyOptional({ description: 'Loan deduction amount', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  loanDeduction?: number;

  @ApiPropertyOptional({ description: 'Net payout amount', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  netPayout?: number;

  @ApiPropertyOptional({ description: 'Settlement status: draft, reviewed, paid', default: 'draft' })
  @IsOptional()
  @IsString()
  status?: string;
}