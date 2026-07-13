import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class RatingDto {
  @ApiProperty()
  @IsString()
  competency!: string;
  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(5)
  score!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
export class CreateReviewDto {
  @ApiProperty()
  @IsString()
  cycleId!: string;
  @ApiProperty()
  @IsString()
  employeeId!: string;
  @ApiProperty()
  @IsString()
  reviewerId!: string;
  @ApiPropertyOptional({ type: [RatingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RatingDto)
  ratings?: RatingDto[];
}
