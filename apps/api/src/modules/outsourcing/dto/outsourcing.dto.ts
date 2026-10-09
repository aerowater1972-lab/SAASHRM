import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorStatus } from '@prisma/client';

export class CreateOutsourcingVendorDto {
  @ApiProperty({ example: 'PT Jasa Tenaga Kerja' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'JTK001' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ example: 'vendor@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '021-1234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Jl. Sudirman No. 1, Jakarta' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '12.345.678.9-012.000' })
  @IsOptional()
  @IsString()
  npwp?: string;

  @ApiPropertyOptional({ example: 'Budi Santoso' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ enum: VendorStatus, default: VendorStatus.ACTIVE })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;
}

export class UpdateOutsourcingVendorDto {
  @ApiPropertyOptional({ example: 'PT Jasa Tenaga Kerja' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'vendor@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '021-1234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Jl. Sudirman No. 1, Jakarta' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '12.345.678.9-012.000' })
  @IsOptional()
  @IsString()
  npwp?: string;

  @ApiPropertyOptional({ example: 'Budi Santoso' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ enum: VendorStatus })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;
}

export class CreateOutsourcingContractDto {
  @ApiProperty({ example: 'VENDOR-001' })
  @IsUUID()
  vendorId!: string;

  @ApiProperty({ example: 'KONTRAK-2026-001' })
  @IsString()
  contractNumber!: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 500000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  contractValue?: number;

  @ApiPropertyOptional({ example: 'IDR', default: 'IDR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Kontrak outsourcing IT support' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/contract.pdf' })
  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class UpdateOutsourcingContractDto {
  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'] as const)
  status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

  @ApiPropertyOptional({ example: 600000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  contractValue?: number;

  @ApiPropertyOptional({ example: 'IDR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Kontrak outsourcing IT support diperpanjang' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/contract.pdf' })
  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class CreateOutsourcedWorkerDto {
  @ApiProperty({ example: 'VENDOR-001' })
  @IsUUID()
  vendorId!: string;

  @ApiPropertyOptional({ example: 'KONTRAK-2026-001' })
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiProperty({ example: 'WKR-001' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ example: 'Andi Wijaya' })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({ example: 'andi@vendor.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: 'IT' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 8000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyCost?: number;

  @ApiPropertyOptional({ example: 'IDR', default: 'IDR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Outsourced IT support staff' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOutsourcedWorkerDto {
  @ApiPropertyOptional({ example: 'KONTRAK-2026-001' })
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiPropertyOptional({ example: 'Senior Software Engineer' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: 'Engineering' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'] as const)
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

  @ApiPropertyOptional({ example: 55000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 9000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyCost?: number;

  @ApiPropertyOptional({ example: 'IDR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Promosi ke senior' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOutsourcedAttendanceDto {
  @ApiProperty({ example: 'WORKER-001' })
  @IsUUID()
  workerId!: string;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: '08:00:00' })
  @IsOptional()
  @IsString()
  clockIn?: string;

  @ApiPropertyOptional({ example: '17:00:00' })
  @IsOptional()
  @IsString()
  clockOut?: string;

  @ApiPropertyOptional({ example: 8.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursWorked?: number;

  @ApiPropertyOptional({ enum: ['PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'OVERTIME'] })
  @IsOptional()
  @IsEnum(['PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'OVERTIME'] as const)
  status?: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'OVERTIME';

  @ApiPropertyOptional({ example: 'Hadir tepat waktu' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOutsourcedCostLogDto {
  @ApiProperty({ example: 'WORKER-001' })
  @IsUUID()
  workerId!: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  periodEnd!: string;

  @ApiProperty({ example: 160 })
  @IsNumber()
  @Min(0)
  hoursWorked!: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiProperty({ example: 8000000 })
  @IsNumber()
  @Min(0)
  totalCost!: number;

  @ApiPropertyOptional({ example: 'IDR', default: 'IDR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'INV-2026-001' })
  @IsOptional()
  @IsString()
  invoiceRef?: string;
}

export class UpdateOutsourcedCostLogDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'PAID', 'REJECTED'] })
  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'PAID', 'REJECTED'] as const)
  status?: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

  @ApiPropertyOptional({ example: 'INV-2026-001' })
  @IsOptional()
  @IsString()
  invoiceRef?: string;

  @ApiPropertyOptional({ example: '2026-02-15' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}