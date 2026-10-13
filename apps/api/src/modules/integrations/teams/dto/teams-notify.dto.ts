import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TeamsNotifyDto {
  @ApiProperty({ example: 'Payroll period 10/2026 has been approved.' })
  @IsString()
  text!: string;

  @ApiProperty({ required: false, example: 'HR Announcement' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false, example: 'Summary shown in the Teams activity feed' })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiProperty({
    required: false,
    example: '00767A',
    description: 'Optional accent colour (hex without #) for the card',
  })
  @IsString()
  @IsOptional()
  themeColor?: string;
}
