import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
