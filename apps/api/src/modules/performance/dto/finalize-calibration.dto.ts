import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class FinalScoreOverrideDto {
  @ApiPropertyOptional({ description: 'Employee whose final score is being set' })
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional({ description: 'Final rating 0-5 (1 decimal)' })
  @IsNumber()
  @Min(0)
  @Max(5)
  finalRating!: number;

  @ApiPropertyOptional({ description: 'Reason for the calibration adjustment (audit trail, BR-01)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class FinalizeCalibrationDto {
  @ApiPropertyOptional({
    description: 'Per-employee final score overrides. If omitted, the employee’s completed manager review overallScore is used.',
    type: [FinalScoreOverrideDto],
  })
  @IsOptional()
  @IsArray()
  finalScores?: FinalScoreOverrideDto[];

  @ApiPropertyOptional({ description: 'Facilitator-provided note recorded for the calibration session audit trail' })
  @IsOptional()
  @IsString()
  note?: string;
}
