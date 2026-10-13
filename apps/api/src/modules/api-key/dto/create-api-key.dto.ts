import { IsString, IsArray, IsOptional, IsDateString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;
}