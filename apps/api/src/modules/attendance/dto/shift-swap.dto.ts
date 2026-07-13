import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
export class ShiftSwapDto {
  @ApiProperty()
  @IsUUID()
  targetEmployeeId!: string;
  @ApiProperty()
  @IsDateString()
  date!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
