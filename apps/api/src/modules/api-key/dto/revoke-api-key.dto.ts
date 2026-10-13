import { IsString, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class RevokeApiKeyDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  revokedAt?: Date;
}