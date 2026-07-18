import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, ValidateIf } from 'class-validator';

export class UpdateAntiSpoofSettingsDto {
  @ApiPropertyOptional({
    description: 'Max acceptable GPS accuracy in meters. Send null to clear the override.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  maxGpsAccuracy?: number | null;

  @ApiPropertyOptional({
    description: 'Max acceptable client clock skew in milliseconds. Send null to clear the override.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  maxClockSkewMs?: number | null;

  @ApiPropertyOptional({
    description: 'Max plausible travel speed in km/h between check-ins. Send null to clear the override.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  maxTravelSpeedKmh?: number | null;
}
