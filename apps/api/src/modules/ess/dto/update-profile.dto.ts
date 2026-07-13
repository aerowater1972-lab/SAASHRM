import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  religion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maritalStatus?: string;

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

  // BR-02: sensitive fields — require HR Admin approval, not applied directly.
  @ApiPropertyOptional({ description: 'NPWP — sensitive, requires HR approval (BR-02)' })
  @IsOptional()
  @IsString()
  taxIdNumber?: string;

  @ApiPropertyOptional({ description: 'BPJS / social security number — sensitive, requires HR approval (BR-02)' })
  @IsOptional()
  @IsString()
  socialSecurityNumber?: string;

  // Convenience alias some clients use for NPWP
  @ApiPropertyOptional({ description: 'Alias for taxIdNumber (NPWP)' })
  @IsOptional()
  @IsString()
  npwp?: string;
}
