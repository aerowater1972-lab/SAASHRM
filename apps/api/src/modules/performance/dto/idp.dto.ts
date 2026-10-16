import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsUUID,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IDPStatus,
  IDPActivityType,
  IDPActivityStatus,
} from '@prisma/client';

export class IDPActivityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: IDPActivityType, default: 'TRAINING' })
  @IsOptional()
  @IsEnum(IDPActivityType)
  type?: IDPActivityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({ enum: IDPActivityStatus, default: 'PENDING' })
  @IsOptional()
  @IsEnum(IDPActivityStatus)
  status?: IDPActivityStatus;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;
}

export class CreateIDPDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewCycleId?: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillsGap?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectives?: string;

  @ApiPropertyOptional({ enum: IDPStatus, default: 'DRAFT' })
  @IsOptional()
  @IsEnum(IDPStatus)
  status?: IDPStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: [IDPActivityDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IDPActivityDto)
  activities?: IDPActivityDto[];
}

export class UpdateIDPDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillsGap?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectives?: string;

  @ApiPropertyOptional({ enum: IDPStatus })
  @IsOptional()
  @IsEnum(IDPStatus)
  status?: IDPStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class IDPStatusDto {
  @ApiProperty({ enum: IDPStatus })
  @IsEnum(IDPStatus)
  status!: IDPStatus;
}

export class IDPListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: IDPStatus })
  @IsOptional()
  @IsEnum(IDPStatus)
  status?: IDPStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
