import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
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

export class CreateExitInterviewCanonicalDto extends CreateExitInterviewDto {
  @ApiProperty({ description: 'Resignation request ID this exit interview belongs to' })
  @IsUUID()
  resignationId!: string;
}
