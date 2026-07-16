import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveOvertimeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectOvertimeDto {
  @ApiProperty({ description: 'Alasan penolakan' })
  @IsString()
  reason!: string;
}

export class RetroactiveApproveOvertimeDto {
  @ApiProperty({ description: 'Alasan tidak mengajukan lembur sebelumnya' })
  @IsString()
  reason!: string;
}
