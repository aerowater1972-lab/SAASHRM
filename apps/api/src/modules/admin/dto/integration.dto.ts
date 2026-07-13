import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum IntegrationType {
  BPJS = 'BPJS',
  BANK = 'BANK',
  BIOMETRIC = 'BIOMETRIC',
  PAYMENT_GATEWAY = 'PAYMENT_GATEWAY',
  EMAIL = 'EMAIL',
  OTHER = 'OTHER',
}

export class CreateIntegrationDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: IntegrationType })
  @IsEnum(IntegrationType)
  type!: IntegrationType;

  @ApiProperty({ description: 'JSON-encoded credentials (will be encrypted at rest)' })
  @IsString()
  credentials!: string;

  @ApiPropertyOptional({ default: '{}' })
  @IsOptional()
  @IsString()
  config?: string;
}

export class UpdateIntegrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'JSON-encoded credentials (will be encrypted at rest)' })
  @IsOptional()
  @IsString()
  credentials?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  config?: string;
}
