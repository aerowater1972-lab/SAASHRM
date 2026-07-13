import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateEntityDto {
  @ApiProperty({ example: 'Head Office' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;
  @ApiProperty({ example: 'HO' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;
  @ApiPropertyOptional({ example: 'parent-uuid' })
  @IsOptional()
  @IsString()
  parentId?: string;
  @ApiPropertyOptional({ example: 'Jl. Sudirman No. 1' })
  @IsOptional()
  @IsString()
  address?: string;
  @ApiPropertyOptional({ example: 'Jakarta' })
  @IsOptional()
  @IsString()
  city?: string;
  @ApiPropertyOptional({ example: 'DKI Jakarta' })
  @IsOptional()
  @IsString()
  province?: string;
  @ApiPropertyOptional({ example: '10210' })
  @IsOptional()
  @IsString()
  postalCode?: string;
  @ApiPropertyOptional({ example: 'Asia/Jakarta', default: 'Asia/Jakarta' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
