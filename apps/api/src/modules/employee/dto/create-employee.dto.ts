import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsDateString, IsUUID, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}
export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}
export enum UnionStatus {
  NONE = 'NONE',
  MEMBER = 'MEMBER',
  OFFICER = 'OFFICER',
}
export class CreateEmployeeDto {
  @ApiPropertyOptional({ description: 'Employee ID (auto-generated if omitted, per BR-01 immutable once set)' })
  @IsOptional()
  @IsString()
  employeeId?: string;
  @ApiProperty()
  @IsString()
  fullName!: string;
  @ApiProperty()
  @IsEmail()
  email!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternativePhone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  birthPlace?: string;
  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  religion?: string;
  @ApiPropertyOptional({ enum: MaritalStatus })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;
  @ApiPropertyOptional({ example: 'K/1', description: 'Kategori PTKP: TK/0..TK/3, K/0..K/3 (GapFix v1.3 — wajib ditinjau HR)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^(TK|K)\/[0-3]$/, { message: 'ptkpCategory harus TK/0..TK/3 atau K/0..K/3' })
  ptkpCategory?: string;
  @ApiPropertyOptional({ enum: UnionStatus, description: 'Addendum Serikat Pekerja: status keanggotaan serikat (feature-flagged labor_union)' })
  @IsOptional()
  @IsEnum(UnionStatus)
  unionStatus?: UnionStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idCardNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxIdNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  socialSecurityNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodType?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allergies?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicalNotes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContact?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyPhone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profilePicture?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
