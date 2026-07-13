import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export class BenefitListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['ALLOWANCE', 'INSURANCE', 'FACILITY', 'OTHER'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isActive?: string;
}
