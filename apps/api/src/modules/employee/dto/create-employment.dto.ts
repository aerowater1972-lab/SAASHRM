import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { EmploymentType } from '@prisma/client';
export class CreateEmploymentDto {
  @ApiProperty()
  @IsUUID()
  positionId!: string;
  @ApiProperty()
  @IsUUID()
  departmentId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  gradeId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;
  @ApiProperty({ enum: EmploymentType })
  @IsEnum(EmploymentType)
  type!: EmploymentType;
  @ApiProperty()
  @IsDateString()
  startDate!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salary?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salaryCurrency?: string;
}
