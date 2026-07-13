import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
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
export class ConvertEmployeeDto {
  @ApiProperty({ description: 'Employee ID (tenant-configured format)' })
  @IsString()
  employeeId!: string;
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
  notes?: string;
}
