import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrainingType, TrainingStatus } from '@prisma/client';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
export class CreateTrainingDto {
  @ApiProperty()
  @IsString()
  title!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiProperty({ enum: TrainingType })
  @IsEnum(TrainingType)
  type!: TrainingType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;
  @ApiProperty()
  @IsDateString()
  startDate!: string;
  @ApiProperty()
  @IsDateString()
  endDate!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;
}
export class UpdateTrainingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ enum: TrainingType })
  @IsOptional()
  @IsEnum(TrainingType)
  type?: TrainingType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;
  @ApiPropertyOptional({ enum: TrainingStatus })
  @IsOptional()
  @IsEnum(TrainingStatus)
  status?: TrainingStatus;
}
export class TrainingFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TrainingType })
  @IsOptional()
  @IsEnum(TrainingType)
  type?: TrainingType;
  @ApiPropertyOptional({ enum: TrainingStatus })
  @IsOptional()
  @IsEnum(TrainingStatus)
  status?: TrainingStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
export class RegisterParticipantDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;
}
export class BulkRegisterParticipantDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  employeeIds!: string[];
}
export class UpdateParticipantDto {
  @ApiPropertyOptional({ enum: ['REGISTERED', 'ATTENDED', 'COMPLETED', 'DROPPED'] })
  @IsOptional()
  @IsEnum(['REGISTERED', 'ATTENDED', 'COMPLETED', 'DROPPED'] as const)
  status?: 'REGISTERED' | 'ATTENDED' | 'COMPLETED' | 'DROPPED';
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}
