import { IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const SAMPLE_TYPES = ['minimal', 'demo', 'full'];
export type SampleType = 'minimal' | 'demo' | 'full';

export class SandboxSetupDto {
  @ApiProperty({ enum: SAMPLE_TYPES, default: 'demo' })
  @IsIn(SAMPLE_TYPES)
  @IsOptional()
  sampleType?: SampleType;
}
