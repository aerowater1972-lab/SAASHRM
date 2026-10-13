import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export type ReferralStatus = 'PENDING' | 'REVIEWING' | 'HIRED' | 'REJECTED';

export class CreateReferralDto {
  @IsString()
  @MaxLength(200)
  candidateName!: string;

  @IsEmail()
  @MaxLength(200)
  candidateEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  candidatePhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resumeUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  positionApplied?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateReferralStatusDto {
  @IsEnum({ PENDING: 'PENDING', REVIEWING: 'REVIEWING', HIRED: 'HIRED', REJECTED: 'REJECTED' })
  status!: ReferralStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bonusAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ReferralListQueryDto {
  @IsOptional()
  @IsEnum({ PENDING: 'PENDING', REVIEWING: 'REVIEWING', HIRED: 'HIRED', REJECTED: 'REJECTED' })
  status?: ReferralStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
