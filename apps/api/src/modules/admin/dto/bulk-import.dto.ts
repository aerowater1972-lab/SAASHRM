import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class BulkImportDto {
  @ApiProperty({ type: [Object], description: 'Array of row objects from parsed CSV' })
  @IsArray()
  rows!: Record<string, string>[];

  @ApiProperty({ required: false, description: 'Column mapping: csvHeader → DTO field' })
  @IsOptional()
  @IsString({ each: true })
  columnMapping?: Record<string, string>;
}

export class BulkImportResultDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  success!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty({ type: [Object], required: false })
  errors?: Array<{ row: number; field: string; message: string }>;
}