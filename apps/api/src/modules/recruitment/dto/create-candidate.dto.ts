import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
export class CreateCandidateDto {
  @ApiProperty()
  @IsString()
  firstName!: string;
  @ApiProperty()
  @IsString()
  lastName!: string;
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
  resumeUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentCompany?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentPosition?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
