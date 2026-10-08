import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';

export class UpsertPreferenceDto {
  @ApiPropertyOptional({ description: 'Language code', default: 'id' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Theme', enum: ['light', 'dark'], default: 'light' })
  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: 'light' | 'dark';

  @ApiPropertyOptional({ description: 'Notification settings (JSON)' })
  @IsOptional()
  notificationSettings?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
}