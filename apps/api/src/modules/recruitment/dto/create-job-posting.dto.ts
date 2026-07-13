import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
export enum PostingEmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
}
export class CreateJobPostingDto {
  @ApiProperty()
  @IsString()
  positionId!: string;
  @ApiProperty()
  @IsString()
  title!: string;
  @ApiProperty()
  @IsString()
  description!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirements?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibilities?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minSalary?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxSalary?: number;
  @ApiPropertyOptional({ enum: PostingEmploymentType })
  @IsOptional()
  @IsEnum(PostingEmploymentType)
  employmentType?: PostingEmploymentType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
  @ApiPropertyOptional({ description: 'Requisition this posting is published under (must be approved)' })
  @IsOptional()
  @IsString()
  requisitionId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  slots?: number;
}
