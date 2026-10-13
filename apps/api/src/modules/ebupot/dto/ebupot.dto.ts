import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsUUID, Min, Max, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EbupotSubmissionStatus } from '@prisma/client';

// Skema perhitungan PPh 21 sesuai PER-16/PJ/2016 + UU HPP (UU 7/2021).
// Digunakan untuk mengisi kolom skema pada Bukti Pemotongan.
export enum EbupotTaxScheme {
  TER_TETAP = 'TER_TETAP',
  TER_CATATAN = 'TER_CATATAN',
  NORESET = 'NORESET',
  NONPENGGANTI = 'NONPENGGANTI',
  PEGAWAI_SEMENTARA = 'PEGAWAI_SEMENTARA',
  PPH_21 = 'PPH_21',
}

// Status hubungan kerja — dipetakan dari EmploymentType karyawan.
export enum EbupotEmploymentType {
  BURUH_HARIAN_LEPAS = 'BURUH_HARIAN_LEPAS',
  PEGAWAI_TIDAK_TETAP = 'PEGAWAI_TIDAK_TETAP',
  PEGAWAI_TETAP = 'PEGAWAI_TETAP',
  PEKERJA_LEPAS = 'PEKERJA_LEPAS',
  PEMBANTU_RUMAH_TANGGA = 'PEMBANTU_RUMAH_TANGGA',
  TENAGA_AHLI = 'TENAGA_AHLI',
  PENSIUNAN = 'PENSIUNAN',
  TKI = 'TKI',
  MANDOR = 'MANDOR',
}

export class GenerateEbupotDto {
  @ApiProperty({ description: 'Tahun pajak (mis. 2027)', example: 2027 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  taxYear!: number;

  @ApiProperty({ description: 'Masa pajak (1-12)', example: 1 })
  @IsInt()
  @Min(1)
  @Max(12)
  taxMonth!: number;

  @ApiPropertyOptional({
    description: 'ID Payroll Run sumber. Kosongkan untuk memakai semua run yang sudah PUBLISHED pada periode tersebut.',
  })
  @IsOptional()
  @IsUUID('4')
  payrollRunId?: string;

  @ApiPropertyOptional({
    description: 'Skema PPh 21 yang dipakai (default TER_CATATAN)',
    enum: EbupotTaxScheme,
    default: 'TER_CATATAN',
  })
  @IsOptional()
  @IsEnum(EbupotTaxScheme)
  taxScheme?: EbupotTaxScheme;
}

export class EbupotQueryDto {
  @ApiPropertyOptional({ description: 'Tahun pajak', example: 2027 })
  @IsOptional()
  @IsInt()
  taxYear?: number;

  @ApiPropertyOptional({ description: 'Masa pajak (1-12)' })
  @IsOptional()
  @IsInt()
  taxMonth?: number;

  @ApiPropertyOptional({ enum: EbupotSubmissionStatus })
  @IsOptional()
  @IsEnum(EbupotSubmissionStatus)
  status?: EbupotSubmissionStatus;
}

export class AmendEbupotDto {
  @ApiProperty({ description: 'Alasan pembetulan (wajib, masuk ke remark 1721)' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({
    description: 'Override bruto (Dasar Pengenaan Pajak). Kosongkan bila tidak berubah.',
  })
  @IsOptional()
  @IsInt()
  bruto?: number;

  @ApiPropertyOptional({ description: 'Override PPh 21 dipotong' })
  @IsOptional()
  @IsInt()
  pph21?: number;
}

export class EbupotCompanyProfileDto {
  @ApiProperty({ description: 'Nama wajib pajak sesuai NPWP' })
  @IsString()
  npwpName!: string;

  @ApiProperty({ description: 'NPWP badan (format 15 digit, boleh dengan tanda titik/strip)' })
  @IsString()
  npwp!: string;

  @ApiProperty({ description: 'Alamat terdaftar KPP' })
  @IsString()
  address!: string;

  @ApiPropertyOptional({ description: 'Kota/kabupaten' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Provinsi' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Kode pos' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Kode KPP administrasi (mis. 023)' })
  @IsOptional()
  @IsString()
  kppCode?: string;

  @ApiPropertyOptional({ description: 'Email kontak pajak' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Nomor telepon kontak pajak' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class EbupotPeriodDto {
  @ApiProperty({ description: 'Tahun pajak', example: 2027 })
  @IsInt()
  taxYear!: number;

  @ApiProperty({ description: 'Masa pajak (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  taxMonth!: number;
}

export class BulkEbupotGenerateDto {
  @ApiProperty({ description: 'Daftar masa pajak (maks 24)', type: [EbupotPeriodDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EbupotPeriodDto)
  periods!: EbupotPeriodDto[];

  @ApiPropertyOptional({ description: 'ID Payroll Run sumber (opsional)' })
  @IsOptional()
  @IsUUID('4')
  payrollRunId?: string;
}

export class BulkEbupotActionDto {
  @ApiProperty({ description: 'Daftar ID e-Bupot yang akan diproses', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}
