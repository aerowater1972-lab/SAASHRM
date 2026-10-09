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
  @ApiPropertyOptional({ description: 'Masa manfaat (bulan) untuk depresiasi garis lurus/saldo menurun' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usefulLifeMonths?: number;
  @ApiPropertyOptional({ description: 'Nilai sisa (residu)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  residualValue?: number;
  @ApiPropertyOptional({ description: 'STRAIGHT_LINE | DECLINING_BALANCE', default: 'STRAIGHT_LINE' })
  @IsOptional()
  @IsString()
  depreciationMethod?: string;
  @ApiPropertyOptional({ description: 'Tanggal mulai depresiasi (default: purchaseDate)' })
  @IsOptional()
  @IsDateString()
  depreciationStartDate?: string;
}
export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
