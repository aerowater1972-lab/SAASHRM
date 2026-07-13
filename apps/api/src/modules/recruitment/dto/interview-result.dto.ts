import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
export class InterviewResultDto {
  @ApiProperty({ description: 'Score 1-10' })
  @IsNumber()
  @Min(1)
  @Max(10)
  score!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}
