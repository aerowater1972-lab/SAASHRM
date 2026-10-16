import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewerType } from '@prisma/client';
export class RatingDto {
  @ApiProperty()
  @IsString()
  competency!: string;
  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(5)
  score!: number;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
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
  @ApiPropertyOptional({ enum: ReviewerType })
  @IsOptional()
  @IsEnum(ReviewerType)
  reviewerType?: ReviewerType;
  @ApiPropertyOptional({ type: [RatingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RatingDto)
  ratings?: RatingDto[];
}
