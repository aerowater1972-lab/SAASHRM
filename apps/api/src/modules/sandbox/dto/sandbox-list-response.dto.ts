import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { SandboxStatus } from './sandbox-status.dto';

export class SandboxListResponse {
  @ApiProperty({ isArray: true, type: SandboxStatus })
  @IsArray()
  data!: SandboxStatus[];
}