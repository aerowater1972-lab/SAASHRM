import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';
import { ResignationType } from '@prisma/client';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
export class CreateResignationDto {
  @ApiProperty({ enum: ResignationType })
  @IsEnum(ResignationType)
  type!: ResignationType;
  @ApiProperty()
  @IsString()
  reason!: string;
  @ApiProperty()
  @IsDateString()
  resignationDate!: string;
  @ApiProperty()
  @IsDateString()
  effectiveDate!: string;
}
export class ResignationFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;
  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] })
  @IsOptional()
  @IsString()
  status?: string;
}
