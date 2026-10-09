import { IsString, IsOptional, IsEnum, IsObject, MinLength, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;
  @ApiPropertyOptional({ example: 'acme.example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;
  @ApiPropertyOptional({ enum: ['STANDARD', 'PROFESSIONAL', 'ENTERPRISE'], default: 'STANDARD' })
  @IsOptional()
  @IsEnum(['STANDARD', 'PROFESSIONAL', 'ENTERPRISE'] as const)
  package?: 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  @ApiPropertyOptional({ default: {} })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
  @ApiPropertyOptional({ description: 'Parent tenant ID untuk multi-company hierarchy' })
  @IsOptional()
  @IsUUID()
  parentTenantId?: string;
}
