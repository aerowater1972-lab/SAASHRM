import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ApplyCarryForwardDto {
  @ApiProperty({ example: 2025, description: 'Year to carry forward from' })
  @IsInt()
  fromYear!: number;

  @ApiProperty({ example: 2026, description: 'Year to carry forward to' })
  @IsInt()
  toYear!: number;
}
