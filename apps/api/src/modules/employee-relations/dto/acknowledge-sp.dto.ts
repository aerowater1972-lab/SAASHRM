import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AcknowledgeSpDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
