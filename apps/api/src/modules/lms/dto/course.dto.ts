import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ValidateNested, MinLength, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CourseEnrollmentStatus, TrainingType } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty({ description: 'Course title' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Course category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: 'Course title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ description: 'Course status' })
  @IsOptional()
  @IsEnum(CourseEnrollmentStatus)
  status?: string;
}

export class EnrollTraineeDto {
  @ApiProperty({ description: 'Employee ID to enroll' })
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional({ description: 'Enrollment status' })
  @IsOptional()
  @IsEnum(CourseEnrollmentStatus)
  status?: CourseEnrollmentStatus;
}

export class BatchEnrollDto {
  @ApiProperty({ type: [String], description: 'Array of employee IDs' })
  @IsArray()
  employeeIds!: string[];

  @ApiPropertyOptional({ default: CourseEnrollmentStatus.ENROLLED })
  @IsOptional()
  @IsEnum(CourseEnrollmentStatus)
  status?: CourseEnrollmentStatus;
}