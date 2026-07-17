import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
export class CreateLeaveRequestDto {
  @ApiProperty()
  @IsString()
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
  @ApiPropertyOptional({ description: 'Addendum v1.2 BR-13: referensi kejadian unik untuk izin sekali-pakai per kejadian' })
  @IsOptional()
  @IsString()
  eventRef?: string;
}
