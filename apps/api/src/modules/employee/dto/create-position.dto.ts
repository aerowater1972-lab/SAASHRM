import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsBoolean, IsInt } from 'class-validator';
export class CreatePositionDto {
  @ApiProperty()
  @IsUUID()
  departmentId!: string;
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty()
  @IsString()
  code!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  gradeId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isHead?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxHeadCount?: number;
}
