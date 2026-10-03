import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateBrandingDto {
  @ApiPropertyOptional({ default: '#2563EB' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'primaryColor must be hex color' })
  primaryColor?: string;
  @ApiPropertyOptional({ default: '#7C3AED' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'secondaryColor must be hex color' })
  secondaryColor?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  faviconUrl?: string;
}
export class UpdateBrandingDto extends PartialType(CreateBrandingDto) {}
