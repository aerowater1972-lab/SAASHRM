import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { ApiKeyResponse } from './api-key-response.dto';

export class ApiKeyListResponse {
  @ApiProperty({ isArray: true, type: ApiKeyResponse })
  @IsArray()
  data!: ApiKeyResponse[];

  @ApiProperty({ example: 0 })
  @ApiProperty({ example: 25 })
  @ApiProperty({ example: 100 })
  @ApiProperty({ description: 'Total count of API keys' })
  total!: number;
}