import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CycleStatus } from '@prisma/client';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export class CycleListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CycleStatus })
  @IsOptional()
  @IsEnum(CycleStatus)
  status?: CycleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
