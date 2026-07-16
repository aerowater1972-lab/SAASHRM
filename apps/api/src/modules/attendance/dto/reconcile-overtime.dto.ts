import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ReconcileOvertimeDto {
  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty({ description: 'Aktual menit lembur dari selisih clock-out' })
  @IsInt()
  @Min(0)
  actualMinutes!: number;

  @ApiPropertyOptional({ description: 'Diisi oleh sistem; default ke user saat ini' })
  @IsOptional()
  @IsString()
  employeeId?: string;
}
