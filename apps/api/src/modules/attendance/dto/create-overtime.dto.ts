import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
export class CreateOvertimeDto {
  @ApiProperty()
  @IsDateString()
  date!: string;
  @ApiProperty()
  @IsDateString()
  startTime!: string;
  @ApiProperty()
  @IsDateString()
  endTime!: string;
  @ApiProperty()
  @IsString()
  reason!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalMinutes?: number;
}
