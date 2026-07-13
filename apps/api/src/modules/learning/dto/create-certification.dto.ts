import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
export class CreateCertificationDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuer?: string;
  @ApiProperty()
  @IsDateString()
  issuedDate!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateUrl?: string;
}
export class UpdateCertificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuer?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateUrl?: string;
}
export class CertificationFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
