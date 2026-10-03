import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max, IsLatitude, IsLongitude, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationPingDto {
  @ApiProperty({ description: 'Latitude coordinate' })
  @IsLatitude()
  @IsNumber()
  lat!: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsLongitude()
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional({ description: 'GPS accuracy in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;

  @ApiPropertyOptional({ description: 'Timestamp of the ping (ISO string), defaults to now' })
  @IsOptional()
  @IsString()
  recordedAt?: string;
}

export class CreateFieldTerritoryDto {
  @ApiProperty({ description: 'Employee ID assigned to this territory' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ description: 'Territory name/label' })
  @IsString()
  territoryName!: string;

  @ApiProperty({ description: 'GeoJSON Polygon or MultiPolygon boundary' })
  @IsString()
  boundaryGeoJson!: string; // Should be valid GeoJSON Polygon/MultiPolygon
}

export class UpdateFieldTerritoryDto {
  @ApiPropertyOptional({ description: 'Territory name/label' })
  @IsOptional()
  @IsString()
  territoryName?: string;

  @ApiPropertyOptional({ description: 'GeoJSON Polygon or MultiPolygon boundary' })
  @IsOptional()
  @IsString()
  boundaryGeoJson?: string;
}

export class UpdateLiveTrackingSettingsDto {
  @ApiPropertyOptional({ description: 'Ping interval in minutes (default: 15)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(120)
  pingIntervalMinutes?: number;

  @ApiPropertyOptional({ description: 'Enable/disable live tracking for field workers' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Retention days for location pings (default: 90)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  retentionDays?: number;

  @ApiPropertyOptional({ description: 'Require explicit consent from employee (default: true)' })
  @IsOptional()
  @IsBoolean()
  requireConsent?: boolean;
}

export class TerritoryAlertDto {
  @ApiProperty({ description: 'Employee ID who triggered the alert' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ description: 'Employee full name' })
  @IsString()
  employeeName!: string;

  @ApiProperty({ description: 'Distance from territory boundary in meters' })
  @IsNumber()
  distanceMeters!: number;

  @ApiProperty({ description: 'Duration outside territory in minutes' })
  @IsNumber()
  durationMinutes!: number;

  @ApiProperty({ description: 'Current coordinates' })
  lat!: number;
  @IsNumber()
  lng!: number;

  @ApiProperty({ description: 'Territory name' })
  @IsString()
  territoryName!: string;
}