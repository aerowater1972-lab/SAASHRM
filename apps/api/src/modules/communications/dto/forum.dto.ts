import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Harus sinkron dengan enum di packages/database/schema.prisma (bagian FORUM). */
export const FORUM_THREAD_TYPES = ['ANNOUNCEMENT', 'DISCUSSION', 'POLL', 'EVENT'] as const;
export const FORUM_VISIBILITIES = ['PUBLIC', 'DEPARTMENT', 'ROLE'] as const;
export const FORUM_REACTION_TYPES = ['LIKE', 'LOVE', 'CELEBRATE', 'INSIGHTFUL', 'CURIOUS'] as const;
export const FORUM_TARGET_TYPES = ['THREAD', 'COMMENT'] as const;
export const FORUM_REPORT_STATUSES = ['PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED'] as const;

export class CreateForumThreadDto {
  @IsIn(FORUM_THREAD_TYPES)
  @IsOptional()
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsIn(FORUM_VISIBILITIES)
  @IsOptional()
  visibility?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  /** Opsi polling (min 2). Hanya untuk type=POLL. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pollOptions?: string[];

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  eventLocation?: string;
}

export class UpdateForumThreadDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) attachments?: string[];
  @IsOptional() @IsIn(FORUM_VISIBILITIES) visibility?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) pollOptions?: string[];
  @IsOptional() @IsDateString() eventDate?: string;
  @IsOptional() @IsString() @MaxLength(255) eventLocation?: string;
  @IsOptional() @IsBoolean() isPinned?: boolean;
  @IsOptional() @IsBoolean() isLocked?: boolean;
}

export class AddForumCommentDto {
  @IsString()
  @MaxLength(5000)
  content!: string;

  /** Parent comment id untuk nested reply (maks 3 level, divalidasi service). */
  @IsOptional()
  @IsString()
  parentCommentId?: string;
}

export class ToggleForumReactionDto {
  @IsIn(FORUM_REACTION_TYPES)
  @IsOptional()
  reactionType?: string;
}

export class ReportForumContentDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class ReviewForumReportDto {
  @IsIn(FORUM_REPORT_STATUSES)
  status!: string;
}

export class CastForumVoteDto {
  @IsInt()
  @Min(0)
  @Max(50)
  optionIndex!: number;
}
