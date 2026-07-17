import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { EmploymentType } from '@prisma/client';
export class CreateEmploymentDto {
  @ApiProperty()
  @IsString()
  positionId!: string;
  @ApiProperty()
  @IsString()
  departmentId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gradeId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
