import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreatePpeAssignmentDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;
  @ApiProperty()
  @IsString()
  ppeType!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  assignedDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
  @ApiPropertyOptional({ default: 'NEW' })
  @IsOptional()
  @IsString()
  condition?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
export class UpdatePpeAssignmentDto extends PartialType(CreatePpeAssignmentDto) {}
