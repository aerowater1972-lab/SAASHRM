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
  @ApiPropertyOptional({
    description: 'Employee ID assigned to this territory. Kosongkan untuk wilayah level department/branch.',
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Department ID for department-level territory (applies to all employees in department).',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ description: 'Territory name/label' })
  @IsString()
  territoryName!: string;

  @ApiProperty({ description: 'GeoJSON Polygon or MultiPolygon boundary' })
  @IsString()
  boundaryGeoJson!: string; // Should be valid GeoJSON Polygon/MultiPolygon
}

export class UpdateFieldTerritoryDto {
  @ApiPropertyOptional({ description: 'Employee ID assigned to this territory' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Department ID for department-level territory' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Territory name/label' })
  @IsOptional()
  @IsString()
  territoryName?: string;

  @ApiPropertyOptional({ description: 'GeoJSON Polygon or MultiPolygon boundary' })
  @IsOptional()
  @IsString()
  boundaryGeoJson?: string;
}

// ── Daily Visit Report (paritas Talenta "Laporan kunjungan harian") ──
export class DailyVisitReportItemDto {
  @ApiProperty({ description: 'Employee ID' })
  employeeId!: string;

  @ApiProperty({ description: 'Employee full name' })
  employeeName!: string;

  @ApiProperty({ description: 'Visit date (YYYY-MM-DD)' })
  visitDate!: string;

  @ApiProperty({ description: 'Total location pings recorded' })
  totalPings!: number;

  @ApiProperty({ description: 'First ping timestamp' })
  firstPingAt!: string | null;

  @ApiProperty({ description: 'Last ping timestamp' })
  lastPingAt!: string | null;

  @ApiProperty({ description: 'Earliest ping coordinates' })
  firstLat!: number | null;

  @ApiProperty({ description: 'Earliest ping coordinates' })
  firstLng!: number | null;

  @ApiProperty({ description: 'Latest ping coordinates' })
  lastLat!: number | null;

  @ApiProperty({ description: 'Latest ping coordinates' })
  lastLng!: number | null;

  @ApiProperty({ description: 'Time spent inside territory (minutes)' })
  minutesInTerritory!: number;

  @ApiProperty({ description: 'Time spent outside territory (minutes)' })
  minutesOutsideTerritory!: number;

  @ApiProperty({ description: 'Territory violations count today' })
  violationsToday!: number;

  @ApiPropertyOptional({ description: 'Territory name assigned' })
  territoryName?: string | null;
}

export class DailyVisitReportDto {
  @ApiProperty({ description: 'Report date (YYYY-MM-DD)' })
  reportDate!: string;

  @ApiProperty({ description: 'Total field workers' })
  totalFieldWorkers!: number;

  @ApiProperty({ description: 'Field workers with at least one ping' })
  activeWorkers!: number;

  @ApiProperty({ description: 'Per-worker visit summary' })
  items!: DailyVisitReportItemDto[];
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