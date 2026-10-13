import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SlackBlock {
  @ApiProperty({ example: 'section' })
  @IsString()
  type!: string;

  @ApiProperty({ type: Object, required: false })
  @IsObject()
  text?: Record<string, any>;

  @ApiProperty({ type: Object, required: false })
  @IsObject()
  accessory?: Record<string, any>;
}

export class SlackNotifyDto {
  @ApiProperty({ example: '#general' })
  @IsString()
  channel!: string;

  @ApiProperty({ example: 'Hello from HR!' })
  @IsString()
  text!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  iconEmoji?: string;

  @ApiProperty({ required: false, isArray: true })
  @IsArray()
  @IsOptional()
  blocks?: SlackBlock[];
}