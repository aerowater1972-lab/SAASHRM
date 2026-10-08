import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateEligibilityRuleDto {
  @ApiProperty({ description: 'Benefit ID this rule applies to' })
  @IsString()
  benefitId!: string;

  @ApiPropertyOptional({ description: 'Grade ID (optional filter)' })
  @IsOptional()
  @IsString()
  gradeId?: string;

  @ApiPropertyOptional({ description: 'Department ID (optional filter)' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Entity ID (optional filter)' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Operator for value comparison (eq, ne, gt, gte, lt, lte, in, not_in, contains)' })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({ description: 'Value to compare against' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: 'Priority (higher = evaluated first)' })
  @IsOptional()
  @IsString()
  priority?: string;
}

export class UpdateEligibilityRuleDto {
  @ApiPropertyOptional({ description: 'Grade ID (optional filter)' })
  @IsOptional()
  @IsString()
  gradeId?: string;

  @ApiPropertyOptional({ description: 'Department ID (optional filter)' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Entity ID (optional filter)' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Operator for value comparison (eq, ne, gt, gte, lt, lte, in, not_in, contains)' })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({ description: 'Value to compare against' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: 'Priority (higher = evaluated first)' })
  @IsOptional()
  @IsString()
  priority?: string;
}