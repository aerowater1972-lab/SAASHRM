import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, IsDateString, Max, Min } from 'class-validator';

export class UpsertTimesheetEntryDto {
  @ApiPropertyOptional({ description: 'ID tugas (opsional bila hanya project)' })
  @IsOptional()
  @IsUUID('4')
  taskId?: string;

  @ApiPropertyOptional({ description: 'ID proyek (opsional bila ada taskId)' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiProperty({ description: 'Tanggal kerja (YYYY-MM-DD)', example: '2026-10-13' })
  @IsDateString()
  workDate!: string;

  @ApiProperty({ description: 'Jam kerja (0.25 - 24)', example: 7.5 })
  @IsNumber()
  @Min(0.25)
  @Max(24)
  hours!: number;

  @ApiPropertyOptional({ description: 'Deskripsi pekerjaan' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Dapat ditagih ke klien (billable)' })
  @IsOptional()
  @IsBoolean()
  billable?: boolean;
}

export class TimesheetQueryDto {
  @ApiPropertyOptional({ description: 'Tanggal anchor dalam minggu (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  anchor?: string;
}
