import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
export class CreateExitInterviewDto {
  @ApiProperty()
  @IsString()
  reason!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  wouldRecommend?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  areasForImprovement?: string;
}
