import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, Min } from 'class-validator';
export enum InterviewType {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  PHONE = 'PHONE',
}
export class CreateInterviewDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  stage!: number;
  @ApiProperty({ enum: InterviewType })
  @IsEnum(InterviewType)
  type!: InterviewType;
  @ApiProperty()
  @IsString()
  interviewerId!: string;
  @ApiProperty()
  @IsDateString()
  scheduledAt!: string;
  @ApiProperty()
  @IsNumber()
  @Min(1)
  durationMinutes!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingLink?: string;
}
