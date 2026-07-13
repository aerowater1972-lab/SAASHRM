import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { OnboardingOwnerTeam } from '@prisma/client';

export class CompleteOnboardingTaskDto {
  @ApiProperty()
  @IsString()
  completedByEmployeeId!: string;

  @ApiProperty({ enum: OnboardingOwnerTeam, description: 'Team of the completer (BR-06: must match task ownerTeam)' })
  @IsEnum(OnboardingOwnerTeam)
  completedByTeam!: OnboardingOwnerTeam;
}
