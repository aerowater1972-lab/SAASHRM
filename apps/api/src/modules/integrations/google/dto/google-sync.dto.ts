import { IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleSyncDto {
  @ApiProperty({
    required: false,
    default: false,
    description: 'When true, only report which users would be synced without calling Google',
  })
  @IsBoolean()
  @IsOptional()
  dryRun?: boolean;
}
