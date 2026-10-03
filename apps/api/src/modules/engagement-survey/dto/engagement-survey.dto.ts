import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, IsArray, ValidateNested, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { SurveyType, QuestionType, SurveyStatus, ActionStatus } from '@prisma/client';

export class SurveyQuestionDto {
  @ApiProperty({ description: 'Question text' })
  @IsString()
  @MinLength(1)
  questionText!: string;

  @ApiProperty({ enum: QuestionType, description: 'Type of question' })
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @ApiPropertyOptional({ type: [String], description: 'Options for multiple choice questions (JSON array)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: 'Whether the question is required (default: true)' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = true;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  order?: number = 0;
}

export class CreateEngagementSurveyDto {
  @ApiProperty({ description: 'Survey title' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ enum: SurveyType, default: SurveyType.PULSE, description: 'Survey type' })
  @IsOptional()
  @IsEnum(SurveyType)
  type?: SurveyType = SurveyType.PULSE;

  @ApiPropertyOptional({ default: true, description: 'Whether responses are anonymous' })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean = true;

  @ApiPropertyOptional({ description: 'Target scope as JSON (departmentIds, gradeIds, etc.)' })
  @IsOptional()
  @IsString()
  targetScope?: string;

  @ApiProperty({ description: 'Survey start date (ISO string)' })
  @IsString()
  startDate!: string;

  @ApiProperty({ description: 'Survey end date (ISO string)' })
  @IsString()
  endDate!: string;

  @ApiPropertyOptional({ type: [SurveyQuestionDto], description: 'Survey questions (optional — uses template when omitted)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDto)
  questions?: SurveyQuestionDto[];
}

export class UpdateEngagementSurveyDto {
  @ApiPropertyOptional({ description: 'Survey title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ enum: SurveyType, description: 'Survey type' })
  @IsOptional()
  @IsEnum(SurveyType)
  type?: SurveyType;

  @ApiPropertyOptional({ description: 'Whether responses are anonymous' })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'Target scope as JSON' })
  @IsOptional()
  @IsString()
  targetScope?: string;

  @ApiPropertyOptional({ description: 'Survey start date' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Survey end date' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ enum: SurveyStatus, description: 'Survey status' })
  @IsOptional()
  @IsEnum(SurveyStatus)
  status?: SurveyStatus;

  @ApiPropertyOptional({ type: [SurveyQuestionDto], description: 'Survey questions' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDto)
  questions?: SurveyQuestionDto[];
}

export class SubmitSurveyResponseDto {
  @ApiProperty({ description: 'Survey ID' })
  @IsString()
  surveyId!: string;

  @ApiProperty({ type: [Object], description: 'Array of question responses: { questionId, answerValue }' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  responses!: { questionId: string; answerValue: string }[];
}

export class CreateSurveyActionItemDto {
  @ApiProperty({ description: 'Action item title' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ description: 'Action item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Assignee user ID' })
  @IsString()
  assigneeId!: string;

  @ApiProperty({ description: 'Due date (ISO string)' })
  @IsString()
  dueDate!: string;
}

export class UpdateSurveyActionItemDto {
  @ApiPropertyOptional({ description: 'Action item title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ description: 'Action item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Assignee user ID' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO string)' })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: ActionStatus, description: 'Action item status' })
  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;
}

export class SurveyFilterDto {
  @ApiPropertyOptional({ enum: SurveyType, description: 'Filter by survey type' })
  @IsOptional()
  @IsEnum(SurveyType)
  type?: SurveyType;

  @ApiPropertyOptional({ enum: SurveyStatus, description: 'Filter by survey status' })
  @IsOptional()
  @IsEnum(SurveyStatus)
  status?: SurveyStatus;

  @ApiPropertyOptional({ description: 'Filter by date range start' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by date range end' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}