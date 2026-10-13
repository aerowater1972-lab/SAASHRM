import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsString } from 'class-validator';
import { SAMPLE_TYPES, SampleType } from './sandbox-setup.dto';

export class SandboxSetupResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Sandbox environment provisioned successfully' })
  @IsString()
  message!: string;

  @ApiProperty({ example: { departments: 2, positions: 3, employees: 5 } })
  @IsObject()
  data!: Record<string, number>;

  @ApiProperty({ enum: SAMPLE_TYPES })
  @IsIn(SAMPLE_TYPES)
  sampleType!: SampleType;
}
