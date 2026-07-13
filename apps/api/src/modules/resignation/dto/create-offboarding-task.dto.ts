import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, IsOptional } from 'class-validator';
import { OffboardingCategory } from '@prisma/client';
export class CreateOffboardingTaskDto {
  @ApiProperty()
  @IsString()
  taskName!: string;
  @ApiProperty()
  @IsUUID()
  assignedTo!: string;
  @ApiProperty({ enum: OffboardingCategory })
  @IsEnum(OffboardingCategory)
  category!: OffboardingCategory;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
