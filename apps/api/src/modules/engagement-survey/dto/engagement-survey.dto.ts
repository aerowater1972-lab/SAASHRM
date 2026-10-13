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

  @ApiProperty({ description: 'Assignee user ID (action item owner)' })
  @IsString()
  assigneeId!: string;

  @ApiProperty({ description: 'Due date (ISO string)' })
  @IsString()
  dueDate!: string;

  @ApiPropertyOptional({ description: 'Initial progress percentage (0-100)', default: 0, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;
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

  @ApiPropertyOptional({ description: 'Progress percentage (0-100). 100 auto-completes the item' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ enum: ActionStatus, description: 'Action item status' })
  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;
}

/** QW-03: owner updates only the progress of their own action item. */
export class UpdateActionItemProgressDto {
  @ApiProperty({ description: 'Progress percentage (0-100). 100 auto-completes the item', minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progress!: number;
}

/** QW-03: query filter for the cross-survey action item list. */
export class SurveyActionItemFilterDto {
  @ApiPropertyOptional({ enum: SurveyStatus, description: 'Filter by survey status' })
  @IsOptional()
  @IsEnum(SurveyStatus)
  surveyStatus?: SurveyStatus;

  @ApiPropertyOptional({ enum: ActionStatus, description: 'Filter by action item status' })
  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;

  @ApiPropertyOptional({ description: 'Only overdue, not-yet-completed items', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overdueOnly?: boolean;

  @ApiPropertyOptional({ description: 'Only items assigned to the current user', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  mineOnly?: boolean;

  @ApiPropertyOptional({ description: 'Search in title / description' })
  @IsOptional()
  @IsString()
  search?: string;

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