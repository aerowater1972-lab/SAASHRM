import { IsString, IsArray, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SlackAttachment {
  @ApiProperty({ example: 'View Details' })
  @IsString()
  text!: string;

  @ApiProperty({ example: 'view_details' })
  @IsString()
  actionId!: string;

  @ApiProperty({ example: 'https://example.com/details' })
  @IsString()
  url!: string;
}

export class SlackNoticeDto {
  @ApiProperty({ example: '#general' })
  @IsString()
  channel!: string;

  @ApiProperty({ example: 'Holiday Reminder' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Reminder: Annual leave requests for next week are due by Friday.' })
  @IsString()
  body!: string;

  @ApiProperty({ required: false, isArray: true })
  @IsArray()
  @IsOptional()
  attachments?: SlackAttachment[];
}