import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  AnnouncementType,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementAudience,
} from '@prisma/client';

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'Announcement title' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ description: 'Announcement content' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ description: 'Announcement type' })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @ApiPropertyOptional({ description: 'Announcement priority' })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiPropertyOptional({ description: 'Initial status' })
  @IsOptional()
  @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;

  @ApiPropertyOptional({ description: 'Target audience' })
  @IsOptional()
  @IsEnum(AnnouncementAudience)
  targetAudience?: AnnouncementAudience;

  @ApiPropertyOptional({ description: 'Target IDs for restricted audience' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetIds?: string[];

  @ApiPropertyOptional({ description: 'Publish date (ISO string)' })
  @IsOptional()
  @IsString()
  publishAt?: string;

  @ApiPropertyOptional({ description: 'Expiration date (ISO string)' })
  @IsOptional()
  @IsString()
  expireAt?: string;

  @ApiPropertyOptional({ description: 'Attachment URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  @ApiPropertyOptional({ description: 'Require read receipts' })
  @IsOptional()
  @IsBoolean()
  readReceiptRequired?: boolean;

  @ApiPropertyOptional({ description: 'Allow comments' })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;
}

export class UpdateAnnouncementDto {
  @ApiPropertyOptional({ description: 'Announcement title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Announcement content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Announcement type' })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @ApiPropertyOptional({ description: 'Announcement priority' })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiPropertyOptional({ description: 'Target audience' })
  @IsOptional()
  @IsEnum(AnnouncementAudience)
  targetAudience?: AnnouncementAudience;

  @ApiPropertyOptional({ description: 'Target IDs for restricted audience' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetIds?: string[];

  @ApiPropertyOptional({ description: 'Publish date (ISO string)' })
  @IsOptional()
  @IsString()
  publishAt?: string;

  @ApiPropertyOptional({ description: 'Expiration date (ISO string)' })
  @IsOptional()
  @IsString()
  expireAt?: string;

  @ApiPropertyOptional({ description: 'Attachment URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  @ApiPropertyOptional({ description: 'Require read receipts' })
  @IsOptional()
  @IsBoolean()
  readReceiptRequired?: boolean;

  @ApiPropertyOptional({ description: 'Allow comments' })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;
}

export class UpdateAnnouncementStatusDto {
  @ApiProperty({ description: 'New announcement status' })
  @IsEnum(AnnouncementStatus)
  status!: AnnouncementStatus;
}