import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ValidateNested, IsEnum, IsInt, Min, Max, IsBoolean, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { FeedbackReviewerType } from '@prisma/client';

export class CreateFeedback360Dto {
  @ApiProperty({ description: 'Reviewee employee ID' })
  @IsNotEmpty()
  revieweeId!: string;

  @ApiProperty({ description: 'Review cycle ID' })
  @IsNotEmpty()
  reviewCycleId!: string;

  @ApiPropertyOptional({ description: 'Feedback type', enum: FeedbackReviewerType })
  @IsOptional()
  @IsEnum(FeedbackReviewerType)
  reviewerType?: FeedbackReviewerType;

  @ApiPropertyOptional({ description: 'Custom reviewer ID' })
  @IsOptional()
  @IsString()
  reviewerId?: string;

  @ApiPropertyOptional({ description: 'Feedback questions' })
  @IsOptional()
  @IsArray()
  questions?: string[];
}

export class SubmitFeedbackDto {
  @ApiProperty({ description: 'Question responses' })
  @IsArray()
  responses!: Array<{ questionText: string; questionType?: string; rating?: number; comment?: string }>;
}

export class FeedbackSettingsDto {
  @ApiPropertyOptional({ description: '360-degree feedback type' })
  @IsOptional()
  @IsEnum(FeedbackReviewerType)
  reviewerType?: FeedbackReviewerType;
}

export class FeedbackReviewDto {
  @ApiPropertyOptional({ description: 'Finalize the review' })
  @IsOptional()
  @IsBoolean()
  finalize?: boolean;
}