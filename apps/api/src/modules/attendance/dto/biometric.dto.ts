import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsArray, IsNumber } from 'class-validator';

export enum BiometricType {
  FINGERPRINT = 'FINGERPRINT',
  FACE = 'FACE',
}

export class EnrollBiometricDto {
  @ApiProperty({ enum: BiometricType })
  @IsEnum(BiometricType)
  type!: BiometricType;

  @ApiProperty({
    description: 'Fingerprint template (device format) or face embedding (JSON array of floats)',
  })
  @IsString()
  reference!: string;

  @ApiPropertyOptional({ description: 'Originating attendance machine id' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class VerifyFaceDto {
  @ApiProperty({ description: 'Probe face embedding (JSON array of floats)' })
  @IsArray()
  @IsNumber({}, { each: true })
  embedding!: number[];
}

export class AdminEnrollBiometricDto {
  @ApiProperty({ description: 'Target employee id to enroll (admin acts on behalf of)' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ enum: BiometricType })
  @IsEnum(BiometricType)
  type!: BiometricType;

  @ApiProperty({
    description: 'Fingerprint template (device format) or face embedding (JSON array of floats)',
  })
  @IsString()
  reference!: string;

  @ApiPropertyOptional({ description: 'Originating attendance machine id' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class DeviceClockInDto {
  @ApiProperty({ description: 'Employee id asserted by the attendance machine' })
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional({ description: 'Originating attendance machine id' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ description: 'Unix millis timestamp used as the HMAC signing nonce' })
  @IsNumber()
  ts!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;
}
