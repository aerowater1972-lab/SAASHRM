import { IsString, IsOptional, IsObject } from 'class-validator';

export class IngestAuditDto {
  @IsString()
  module!: string;

  @IsString()
  entity!: string;

  @IsString()
  entityId!: string;

  @IsString()
  action!: string;

  @IsString()
  changedBy!: string;

  @IsOptional()
  @IsObject()
  oldValue?: Record<string, any>;

  @IsOptional()
  @IsObject()
  newValue?: Record<string, any>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
