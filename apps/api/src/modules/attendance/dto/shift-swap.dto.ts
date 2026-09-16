import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
export class ShiftSwapDto {
  @ApiProperty()
  @IsString()
  targetEmployeeId!: string;
  @ApiProperty()
  @IsDateString()
  date!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
