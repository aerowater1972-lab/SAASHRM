import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
export class AssignAssetDto {
  @ApiProperty({ description: 'Employee ID to assign the asset to' })
  @IsString()
  @IsNotEmpty()
  employeeId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignAssetCanonicalDto extends AssignAssetDto {
  @ApiProperty({ description: 'Asset ID to assign' })
  @IsUUID()
  assetId!: string;
}
export class ReturnAssetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conditionOnReturn?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
