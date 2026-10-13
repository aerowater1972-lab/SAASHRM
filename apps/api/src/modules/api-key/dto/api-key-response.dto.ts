import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsArray, IsDate, IsOptional, IsBoolean } from 'class-validator';

export class ApiKeyResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'api-key-name' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'a1b2c3d4e5f6' })
  @IsString()
  keyPrefix!: string;

  @ApiProperty({ isArray: true, example: ['read', 'write'] })
  @IsArray()
  @IsString({ each: true })
  scopes!: string[];

  @ApiProperty({ required: false, type: Date })
  @IsDate()
  @IsOptional()
  lastUsedAt?: Date;

  @ApiProperty({ required: false, type: Date })
  @IsDate()
  @IsOptional()
  expiresAt?: Date;

  @ApiProperty({ type: Date })
  @IsDate()
  createdAt!: Date;

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  isActive!: boolean;
}