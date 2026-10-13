import { IsString, IsArray, IsDateString, IsOptional, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateApiKeyDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;
}