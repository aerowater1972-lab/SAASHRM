import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt } from 'class-validator';
export class CreateGradeDto {
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty()
  @IsString()
  code!: string;
  @ApiProperty()
  @IsInt()
  level!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
