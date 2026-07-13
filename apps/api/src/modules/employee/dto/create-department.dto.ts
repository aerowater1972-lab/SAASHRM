import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsInt, IsDateString } from 'class-validator';
export class CreateDepartmentDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty()
  @IsString()
  code!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  headEmployeeId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  level?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}
