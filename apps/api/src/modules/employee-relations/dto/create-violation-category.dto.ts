import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateViolationCategoryDto {
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty()
  @IsString()
  code!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  severity?: number;
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canSkipSP1?: boolean;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateViolationCategoryDto extends PartialType(CreateViolationCategoryDto) {}
