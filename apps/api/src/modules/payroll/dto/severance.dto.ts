import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSeveranceDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty({
    example: 'TERMINATION',
    description: 'RESIGNATION | TERMINATION | EFFICIENCY | RETIREMENT | DEATH | MISCONDUCT | ILLNESS | CONTRACT_END',
  })
  @IsString()
  cause!: string;

  @ApiProperty()
  @IsDateString()
  terminationDate!: string;

  @ApiPropertyOptional({ description: 'Uang pisah sesuai PKB/kontrak' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pisahAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
