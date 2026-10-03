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
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
export enum BpjsType {
  KESEHATAN = 'KESEHATAN',
  KES = 'KES',
  KET = 'KET',
  JKK = 'JKK',
  JKM = 'JKM',
  JHT = 'JHT',
  JP = 'JP',
}
export enum BpjsRiskLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}
export enum BpjsClaimType {
  RAWAT_INAP = 'RAWAT_INAP',
  RAWAT_JALAN = 'RAWAT_JALAN',
  KUNING = 'KUNING',
  MERAH = 'MERAH',
  KELAHIRAN = 'KELAHIRAN',
  LAINNYA = 'LAINNYA',
}
export enum BpjsClaimStatus {
  SUBMITTED = 'SUBMITTED',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}
export class CreateBpjsConfigDto {
  @ApiProperty({ enum: BpjsType })
  @IsEnum(BpjsType)
  bpjsType!: BpjsType;
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  employerRate!: number;
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  employeeRate!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxWageCap?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minWage?: number;
  @ApiPropertyOptional({ enum: BpjsRiskLevel })
  @IsOptional()
  @IsEnum(BpjsRiskLevel)
  riskLevel?: BpjsRiskLevel;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  jkkRate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class BpjsCalculationDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;
  @ApiProperty()
  @IsUUID()
  periodId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  baseSalary?: number;
}
export class BpjsReportDto {
  @ApiProperty()
  @IsUUID()
  periodId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;
}
export class CreateBpjsClaimDto {
  @ApiProperty({ enum: BpjsClaimType })
  @IsEnum(BpjsClaimType)
  claimType!: BpjsClaimType;
  @ApiProperty({ description: 'Employee ID (user id) pemilik klaim' })
  @IsString()
  employeeId!: string;
  @ApiProperty()
  @IsString()
  claimNumber!: string;
  @ApiProperty()
  @IsString()
  diagnosisCode!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosisName?: string;
  @ApiProperty()
  @IsDateString()
  admissionDate!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dischargeDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  daysOfCare?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hospitalCode?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hospitalName?: string;
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  claimAmount!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  approvedAmount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  patientShare?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
export class UpdateBpjsClaimDto {
  @ApiPropertyOptional({ enum: BpjsClaimStatus })
  @IsOptional()
  @IsEnum(BpjsClaimStatus)
  status?: BpjsClaimStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  approvedAmount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  patientShare?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
export class BpjsClaimFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(BpjsClaimStatus)
  status?: BpjsClaimStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(BpjsClaimType)
  claimType?: BpjsClaimType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
