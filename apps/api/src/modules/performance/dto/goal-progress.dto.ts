import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
export class GoalProgressDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualValue!: number;
}
