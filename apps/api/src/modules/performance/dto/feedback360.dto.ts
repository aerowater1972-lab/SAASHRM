import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FeedbackReviewerType,
  FeedbackStatus,
} from '@prisma/client';

export class Feedback360QuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty()
  @IsString()
  questionText!: string;

  @ApiPropertyOptional({ default: 'LIKERT_5' })
  @IsOptional()
  @IsString()
  questionType?: string; // LIKERT_5, NA, TEXT

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

export class CreateFeedback360Dto {
  @ApiProperty()
  @IsUUID()
  reviewCycleId!: string;

  @ApiProperty()
  @IsUUID()
  revieweeId!: string;

  @ApiProperty()
  @IsUUID()
  reviewerId!: string;

  @ApiPropertyOptional({ enum: FeedbackReviewerType })
  @IsOptional()
  @IsEnum(FeedbackReviewerType)
  reviewerType?: FeedbackReviewerType;

  @ApiPropertyOptional({ enum: FeedbackStatus, default: 'PENDING' })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @ApiPropertyOptional({ description: 'Daftar teks soal (string) atau objek pertanyaan' })
  @IsOptional()
  @IsArray()
  questions?: any[];
}

export class Feedback360ResponseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  questionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  questionText?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class SubmitFeedback360Dto {
  @ApiProperty({ type: [Feedback360ResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Feedback360ResponseDto)
  responses!: Feedback360ResponseDto[];
}

export class ReviewFeedback360Dto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  flagForFollowUp?: boolean;
}

export class Feedback360ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewCycleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  revieweeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @ApiPropertyOptional({ enum: FeedbackStatus })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
