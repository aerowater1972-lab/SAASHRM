import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsUUID, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { AnnouncementStatus, AnnouncementAudience, AnnouncementType, AnnouncementPriority } from '@prisma/client';

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'Announcement title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Announcement content' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Announcement type', default: 'GENERAL' })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @ApiPropertyOptional({ description: 'Priority', enum: AnnouncementPriority, default: 'NORMAL' })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiPropertyOptional({ description: 'Target audience', enum: AnnouncementAudience, default: 'ALL' })
  @IsOptional()
  @IsEnum(AnnouncementAudience)
  targetAudience?: AnnouncementAudience;

  @ApiPropertyOptional({ description: 'Target department/user IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetIds?: string[];

  @ApiPropertyOptional({ description: 'Scheduled publish date (ISO)' })
  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @ApiPropertyOptional({ description: 'Expiration date (ISO)' })
  @IsOptional()
  @IsDateString()
  expireAt?: string;

  @ApiPropertyOptional({ description: 'Attachment URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  @ApiPropertyOptional({ description: 'Require read receipt', default: false })
  @IsOptional()
  @IsBoolean()
  readReceiptRequired?: boolean;

  @ApiPropertyOptional({ description: 'Allow comments', default: true })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional({ description: 'Initial status', enum: AnnouncementStatus })
  @IsOptional()
  @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;
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

  @ApiPropertyOptional({ description: 'Priority', enum: AnnouncementPriority })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiPropertyOptional({ description: 'Target audience', enum: AnnouncementAudience })
  @IsOptional()
  @IsEnum(AnnouncementAudience)
  targetAudience?: AnnouncementAudience;

  @ApiPropertyOptional({ description: 'Target department/user IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetIds?: string[];

  @ApiPropertyOptional({ description: 'Scheduled publish date (ISO)' })
  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @ApiPropertyOptional({ description: 'Expiration date (ISO)' })
  @IsOptional()
  @IsDateString()
  expireAt?: string;

  @ApiPropertyOptional({ description: 'Attachment URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  @ApiPropertyOptional({ description: 'Require read receipt' })
  @IsOptional()
  @IsBoolean()
  readReceiptRequired?: boolean;

  @ApiPropertyOptional({ description: 'Allow comments' })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;
}

export class UpdateAnnouncementStatusDto {
  @ApiProperty({ description: 'New status', enum: AnnouncementStatus })
  @IsEnum(AnnouncementStatus)
  status!: AnnouncementStatus;
}