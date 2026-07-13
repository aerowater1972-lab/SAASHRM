import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
export class CreateLeaveRequestDto {
  @ApiProperty()
  @IsUUID()
  leaveTypeId!: string;
  @ApiProperty()
  @IsDateString()
  startDate!: string;
  @ApiProperty()
  @IsDateString()
  endDate!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  totalDays?: number;
  @ApiProperty()
  @IsString()
  reason!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;
}
