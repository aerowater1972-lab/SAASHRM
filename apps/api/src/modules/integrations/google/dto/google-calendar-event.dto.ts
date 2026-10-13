import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleCalendarEventDto {
  @ApiProperty({ example: 'Annual Leave — Budi Santoso' })
  @IsString()
  summary!: string;

  @ApiProperty({ required: false, example: 'Approved via HRMS leave request LR-0001' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '2026-10-20',
    description: 'Start date (YYYY-MM-DD for all-day) or RFC3339 datetime',
  })
  @IsString()
  start!: string;

  @ApiProperty({
    example: '2026-10-21',
    description: 'End date (YYYY-MM-DD, exclusive for all-day) or RFC3339 datetime',
  })
  @IsString()
  end!: string;

  @ApiProperty({
    required: false,
    example: ['budi@example.com', 'manager@example.com'],
  })
  @IsArray()
  @IsOptional()
  attendees?: string[];

  @ApiProperty({ required: false, example: 'Asia/Jakarta' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ required: false, description: 'Email attendees about the event' })
  @IsOptional()
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}
