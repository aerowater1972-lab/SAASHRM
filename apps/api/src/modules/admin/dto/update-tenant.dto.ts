import { IsString, IsOptional, IsEnum, IsObject, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'acme.example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'TRIAL', 'EXPIRED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'SUSPENDED', 'TRIAL', 'EXPIRED'] as const)
  status?: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'EXPIRED';

  @ApiPropertyOptional({ enum: ['STANDARD', 'PROFESSIONAL', 'ENTERPRISE'] })
  @IsOptional()
  @IsEnum(['STANDARD', 'PROFESSIONAL', 'ENTERPRISE'] as const)
  package?: 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
