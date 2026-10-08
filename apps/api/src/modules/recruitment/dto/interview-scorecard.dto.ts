import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsInt, Min, Max, MinLength } from 'class-validator';

export class CreateInterviewScorecardDto {
  @ApiProperty({ description: 'Interview ID' })
  @IsUUID()
  interviewId!: string;

  @ApiProperty({ description: 'Competency name' })
  @IsString()
  @MinLength(1)
  competency!: string;

  @ApiProperty({ description: 'Score (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}