import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { AssetCategory, AssetCondition } from '@prisma/client';
export class CreateAssetDto {
  @ApiProperty({ description: 'Asset name' })
  @IsString()
  @IsNotEmpty()
  name!: string;
  @ApiProperty({ description: 'Unique asset code' })
  @IsString()
  @IsNotEmpty()
  code!: string;
  @ApiProperty({ enum: AssetCategory })
  @IsEnum(AssetCategory)
  category!: AssetCategory;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;
  @ApiPropertyOptional({ enum: AssetCondition })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
