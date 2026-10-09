import { IsString, IsOptional, IsEnum, IsDateString, IsArray, IsUUID, IsBoolean, IsObject, ValidateNested, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ConsentPurpose, ConsentStatus, DataSubjectRequestType, DataSubjectRequestStatus, DataSubjectType } from '@prisma/client';

// ========== CONSENT DTOs ==========

export class CreateConsentRecordDto {
  @ApiProperty({ example: 'EMP-001' })
  @IsString()
  dataSubjectId!: string;

  @ApiProperty({ enum: DataSubjectType, example: DataSubjectType.EMPLOYEE })
  @IsEnum(DataSubjectType)
  dataSubjectType!: DataSubjectType;

  @ApiProperty({ enum: ConsentPurpose, example: ConsentPurpose.PAYROLL_PROCESSING })
  @IsEnum(ConsentPurpose)
  purpose!: ConsentPurpose;

  @ApiPropertyOptional({ example: 'Monthly payroll processing including tax deductions' })
  @IsOptional()
  @IsString()
  purposeDetail?: string;

  @ApiPropertyOptional({ example: 'EMP-001', description: 'Who gave consent (self/guardian/admin)' })
  @IsOptional()
  @IsString()
  givenBy?: string;

  @ApiPropertyOptional({ example: 'digital', description: 'digital/paper/verbal' })
  @IsOptional()
  @IsString()
  givenMethod?: string;

  @ApiPropertyOptional({ example: '1.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z', description: 'Optional expiry date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Additional context (IP, user agent, etc.)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateConsentRecordDto {
  @ApiPropertyOptional({ enum: ConsentStatus })
  @IsOptional()
  @IsEnum(ConsentStatus)
  status?: 'GIVEN' | 'WITHDRAWN' | 'EXPIRED' | 'REVOKED_BY_ADMIN';

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Withdrawal reason' })
  @IsOptional()
  @IsString()
  withdrawalReason?: string;

  @ApiPropertyOptional({ description: 'Revocation reason (admin only)' })
  @IsOptional()
  @IsString()
  revocationReason?: string;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class WithdrawConsentDto {
  @ApiProperty({ description: 'Reason for withdrawal' })
  @IsString()
  withdrawalReason!: string;

  @ApiPropertyOptional({ example: 'EMP-001', description: 'Who withdrew (self/guardian/admin)' })
  @IsOptional()
  @IsString()
  withdrawnBy?: string;
}

export class BulkConsentRecordDto {
  @ApiProperty({ type: [CreateConsentRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConsentRecordDto)
  records!: CreateConsentRecordDto[];
}

// ========== DATA SUBJECT REQUEST DTOs ==========

export class CreateDataSubjectRequestDto {
  @ApiProperty({ enum: DataSubjectRequestType, example: DataSubjectRequestType.ACCESS })
  @IsEnum(DataSubjectRequestType)
  requestType!: DataSubjectRequestType;

  @ApiProperty({ example: 'EMP-001' })
  @IsString()
  dataSubjectId!: string;

  @ApiProperty({ enum: DataSubjectType, example: DataSubjectType.EMPLOYEE })
  @IsEnum(DataSubjectType)
  dataSubjectType!: DataSubjectType;

  @ApiProperty({ example: 'budi@example.com' })
  @IsString()
  dataSubjectEmail!: string;

  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  dataSubjectName!: string;

  @ApiProperty({ example: 'Request access to all my personal data including payroll, attendance, and medical records' })
  @IsString()
  requestDetails!: string;

  @ApiPropertyOptional({ example: 'UU PDP Pasal 15 ayat (1) - Hak akses data pribadi' })
  @IsOptional()
  @IsString()
  legalBasis?: string;

  @ApiPropertyOptional({ example: 'self', description: 'self/legal_representative/admin' })
  @IsOptional()
  @IsString()
  submittedBy?: string;

  @ApiPropertyOptional({ description: 'Supporting documents' })
  @IsOptional()
  @IsObject()
  attachments?: Record<string, any>;
}

export class UpdateDataSubjectRequestDto {
  @ApiPropertyOptional({ enum: DataSubjectRequestStatus })
  @IsOptional()
  @IsEnum(DataSubjectRequestStatus)
  status?: 'PENDING' | 'UNDER_VERIFICATION' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'EXPIRED';

  @ApiPropertyOptional({ example: 'DPO-001' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Summary of actions taken' })
  @IsOptional()
  @IsString()
  responseSummary?: string;
}

export class VerifyDataSubjectRequestDto {
  @ApiProperty({ example: 'verification-token-from-email' })
  @IsString()
  verificationToken!: string;
}

export class AddActivityDto {
  @ApiProperty({ example: 'VERIFIED', description: 'CREATED/VERIFIED/APPROVED/STARTED/COMPLETED/REJECTED/NOTE_ADDED' })
  @IsString()
  action!: string;

  @ApiProperty({ example: 'Verified identity via email OTP' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ========== DATA RETENTION POLICY DTOs ==========

export class CreateDataRetentionPolicyDto {
  @ApiProperty({ example: 'EMPLOYEE_DATA' })
  @IsString()
  dataCategory!: string;

  @ApiProperty({ example: 'Employee personal and employment data' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 2555, description: 'Retention period in days (e.g., 7 years = 2555 days)' })
  @IsNumber()
  retentionPeriodDays!: number;

  @ApiProperty({ example: 'UU No. 13/2003 Pasal 97, UU PDP Pasal 15' })
  @IsString()
  legalBasis!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoDelete?: boolean;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsNumber()
  notifyBeforeDays?: number;
}

export class UpdateDataRetentionPolicyDto {
  @ApiPropertyOptional({ description: 'Description of the policy' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Retention period in days' })
  @IsOptional()
  @IsNumber()
  retentionPeriodDays?: number;

  @ApiPropertyOptional({ description: 'Legal basis reference' })
  @IsOptional()
  @IsString()
  legalBasis?: string;

  @ApiPropertyOptional({ description: 'Whether to auto-anonymize' })
  @IsOptional()
  @IsBoolean()
  autoDelete?: boolean;

  @ApiPropertyOptional({ description: 'Days before expiry to notify' })
  @IsOptional()
  @IsNumber()
  notifyBeforeDays?: number;

  @ApiPropertyOptional({ description: 'Whether policy is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ========== DATA PROCESSING LOG DTOs ==========

export class CreateDataProcessingLogDto {
  @ApiProperty({ example: 'EMP-001' })
  @IsString()
  dataSubjectId!: string;

  @ApiProperty({ enum: DataSubjectType, example: DataSubjectType.EMPLOYEE })
  @IsEnum(DataSubjectType)
  dataSubjectType!: DataSubjectType;

  @ApiProperty({ enum: ConsentPurpose, example: ConsentPurpose.PAYROLL_PROCESSING })
  @IsEnum(ConsentPurpose)
  processingPurpose!: ConsentPurpose;

  @ApiProperty({ type: [String], example: ['PERSONAL_ID', 'SALARY', 'TAX_ID', 'BANK_ACCOUNT'] })
  @IsArray()
  @IsString({ each: true })
  dataCategories!: string[];

  @ApiProperty({ example: 'Legal_Obligation', description: 'Consent/Contract/Legal_Obligation/Vital_Interest/Public_Task/Legitimate_Interest' })
  @IsString()
  lawfulBasis!: string;

  @ApiPropertyOptional({ example: 'PT Jasa Payroll' })
  @IsOptional()
  @IsString()
  processorName?: string;

  @ApiPropertyOptional({ example: 'Indonesia' })
  @IsOptional()
  @IsString()
  processorLocation?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  dpiaRequired?: boolean;

  @ApiPropertyOptional({ example: 'DPIA-2026-001' })
  @IsOptional()
  @IsString()
  dpiaReference?: string;

  @ApiPropertyOptional({ example: 'LOW', description: 'LOW/MEDIUM/HIGH' })
  @IsOptional()
  @IsString()
  riskLevel?: string;
}

export class UpdateDataProcessingLogDto {
  @ApiPropertyOptional({ description: 'End date of processing' })
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional({ example: 'ENDED', description: 'ACTIVE/ENDED/SUSPENDED' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'MEDIUM', description: 'LOW/MEDIUM/HIGH' })
  @IsOptional()
  @IsString()
  riskLevel?: string;
}

// ========== QUERY DTOs ==========

export class ConsentRecordQueryDto {
  @ApiPropertyOptional({ enum: DataSubjectType })
  @IsOptional()
  @IsEnum(DataSubjectType)
  dataSubjectType?: DataSubjectType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dataSubjectId?: string;

  @ApiPropertyOptional({ enum: ConsentPurpose })
  @IsOptional()
  @IsEnum(ConsentPurpose)
  purpose?: ConsentPurpose;

  @ApiPropertyOptional({ enum: ConsentStatus })
  @IsOptional()
  @IsEnum(ConsentStatus)
  status?: ConsentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresBefore?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAfter?: string;
}

export class DataSubjectRequestQueryDto {
  @ApiPropertyOptional({ enum: DataSubjectRequestType })
  @IsOptional()
  @IsEnum(DataSubjectRequestType)
  requestType?: DataSubjectRequestType;

  @ApiPropertyOptional({ enum: DataSubjectRequestStatus })
  @IsOptional()
  @IsEnum(DataSubjectRequestStatus)
  status?: DataSubjectRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dataSubjectId?: string;

  @ApiPropertyOptional({ enum: DataSubjectType })
  @IsOptional()
  @IsEnum(DataSubjectType)
  dataSubjectType?: DataSubjectType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAfter?: string;
}

export class DataRetentionPolicyQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dataCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class DataProcessingLogQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dataSubjectId?: string;

  @ApiPropertyOptional({ enum: DataSubjectType })
  @IsOptional()
  @IsEnum(DataSubjectType)
  dataSubjectType?: DataSubjectType;

  @ApiPropertyOptional({ enum: ConsentPurpose })
  @IsOptional()
  @IsEnum(ConsentPurpose)
  processingPurpose?: ConsentPurpose;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}