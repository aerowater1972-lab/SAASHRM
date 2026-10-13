import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/** Sinkron dengan enum schema.prisma (bagian COMPENSATION MANAGEMENT). */
export const COMP_CYCLE_TYPES = ['ANNUAL', 'MID_YEAR', 'PROMOTION', 'AD_HOC'] as const;
export const COMP_CYCLE_STATUSES = [
  'DRAFT',
  'OPEN',
  'IN_REVIEW',
  'APPROVED',
  'APPLIED',
  'CLOSED',
  'CANCELLED',
] as const;
export const COMP_ADJUST_TYPES = ['MERIT', 'PROMOTION', 'MARKET_ADJUST', 'COLA'] as const;
export const COMP_ADJUST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'CANCELLED'] as const;

export class CreateSalaryStructureDto {
  @IsString()
  @MaxLength(100)
  jobFamily!: string;

  @IsString()
  @MaxLength(50)
  grade!: string;

  @IsNumber()
  @Min(0)
  minSalary!: number;

  @IsNumber()
  @Min(0)
  midSalary!: number;

  @IsNumber()
  @Min(0)
  maxSalary!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  effectiveDate!: string;
}

export class UpdateSalaryStructureDto {
  @IsOptional() @IsNumber() @Min(0) minSalary?: number;
  @IsOptional() @IsNumber() @Min(0) midSalary?: number;
  @IsOptional() @IsNumber() @Min(0) maxSalary?: number;
  @IsOptional() @IsDateString() effectiveDate?: string;
}

export class CreateReviewCycleDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsIn(COMP_CYCLE_TYPES)
  type?: string;

  @IsDateString()
  effectiveDate!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBudget?: number;
}

export class CreateAdjustmentDto {
  @IsOptional()
  @IsUUID()
  reviewCycleId?: string;

  @IsString()
  employeeId!: string;

  @IsNumber()
  @Min(0)
  currentSalary!: number;

  @IsNumber()
  @Min(0)
  proposedSalary!: number;

  @IsOptional()
  @IsIn(COMP_ADJUST_TYPES)
  adjustmentType?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsDateString()
  effectiveDate!: string;
}

export class BulkAdjustmentItemDto {
  @IsString()
  employeeId!: string;

  @IsNumber()
  @Min(0)
  currentSalary!: number;

  @IsNumber()
  @Min(0)
  proposedSalary!: number;

  @IsOptional()
  @IsIn(COMP_ADJUST_TYPES)
  adjustmentType?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkAdjustmentDto {
  @IsOptional()
  @IsUUID()
  reviewCycleId?: string;

  @IsDateString()
  effectiveDate!: string;

  items!: BulkAdjustmentItemDto[];
}

export class SyncAdjustmentDto {
  @IsOptional()
  @IsString()
  description?: string;
}
