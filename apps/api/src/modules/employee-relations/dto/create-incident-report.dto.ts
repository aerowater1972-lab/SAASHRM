import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { IncidentSeverity, IncidentCategory } from '@prisma/client';

export class CreateIncidentReportDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;
  @ApiProperty()
  @IsString()
  location!: string;
  @ApiProperty()
  @IsDateString()
  incidentDate!: string;
  @ApiProperty({ enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  severity!: IncidentSeverity;
  @ApiProperty({ enum: IncidentCategory })
  @IsEnum(IncidentCategory)
  category!: IncidentCategory;
  @ApiProperty()
  @IsString()
  description!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  authorityReportDeadline?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reportedById?: string;
}
export class UpdateIncidentReportDto extends PartialType(CreateIncidentReportDto) {
  @ApiPropertyOptional({ enum: ['REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] })
  @IsOptional()
  @IsString()
  status?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
