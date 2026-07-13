import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { OnboardingOwnerTeam } from '@prisma/client';

export class CreateOnboardingTaskDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicationId?: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: OnboardingOwnerTeam })
  @IsEnum(OnboardingOwnerTeam)
  ownerTeam!: OnboardingOwnerTeam;

  @ApiPropertyOptional({ description: 'Specific owner employee; if omitted any member of ownerTeam may complete' })
  @IsOptional()
  @IsString()
  ownerEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
