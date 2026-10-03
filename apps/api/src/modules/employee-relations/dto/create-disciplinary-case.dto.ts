import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateDisciplinaryCaseDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;
  @ApiProperty()
  @IsString()
  violationCategoryId!: string;
  @ApiProperty()
  @IsString()
  description!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
export class UpdateDisciplinaryCaseDto extends PartialType(CreateDisciplinaryCaseDto) {}
