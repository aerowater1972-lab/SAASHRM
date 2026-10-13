import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { BiometricService } from '../services/biometric.service';
import { LivenessService } from '../services/liveness.service';
import {
  EnrollBiometricDto,
  VerifyFaceDto,
  DeviceClockInDto,
  AdminEnrollBiometricDto,
} from '../dto/biometric.dto';
import { VerifyLivenessDto } from '../dto/liveness.dto';

@ApiTags('Attendance - Biometric')
@Controller('attendance/biometric')
export class BiometricController {
  constructor(
    private readonly biometricService: BiometricService,
    private readonly livenessService: LivenessService,
  ) {}

  @Post('enroll')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('ess:attendance:clock')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll a fingerprint template or face embedding for the current user' })
  enroll(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: EnrollBiometricDto,
  ) {
    return this.biometricService.enroll(tenantId, employeeId, dto.type, dto.reference, dto.deviceId);
  }

  @Post('verify')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('ess:attendance:clock')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a probe face embedding against the current user enrollment (on-prem)' })
  verify(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: VerifyFaceDto,
  ) {
    this.livenessService.assertToken(tenantId, employeeId, dto.livenessToken);
    return this.biometricService.verifyFace(tenantId, employeeId, dto.embedding);
  }

  // ====================== LIVENESS CHALLENGE (anti-spoof) ======================

  @Post('liveness/challenge')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('ess:attendance:clock')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Minta liveness challenge (urutan gerakan acak: BLINK/TURN_HEAD) sebelum verifikasi wajah',
  })
  createLivenessChallenge(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.livenessService.createChallenge(tenantId, employeeId);
  }

  @Post('liveness/verify')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('ess:attendance:clock')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tukar gerakan liveness yang selesai menjadi token HMAC sekali pakai',
  })
  verifyLiveness(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: VerifyLivenessDto,
  ) {
    return this.livenessService.verifyChallenge(
      tenantId,
      employeeId,
      dto.challengeId,
      dto.events,
    );
  }

  @Post('admin/enroll')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('attendance:biometric:enroll')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: enroll a fingerprint template or face embedding for an arbitrary employee' })
  adminEnroll(
    @TenantId() tenantId: string,
    @Body() dto: AdminEnrollBiometricDto,
  ) {
    return this.biometricService.enroll(tenantId, dto.employeeId, dto.type, dto.reference, dto.deviceId);
  }

  @Get('admin/devices')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('attendance:biometric:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: list registered machines (no secrets)' })
  listDevices(@TenantId() tenantId: string) {
    return this.biometricService.listDevices(tenantId);
  }

  @Get('admin/:employeeId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('attendance:biometric:read')
  @ApiBearerAuth()
  @ApiParam({ name: 'employeeId', description: 'Target employee id' })
  @ApiOperation({ summary: 'Admin: list biometric credentials for an employee' })
  listForEmployee(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.biometricService.listForEmployee(tenantId, employeeId);
  }

  @Patch('admin/credential/:id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('attendance:biometric:enroll')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Biometric credential id' })
  @ApiOperation({ summary: 'Admin: activate or deactivate a biometric credential' })
  setActive(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.biometricService.setActive(tenantId, id, body.isActive);
  }

  @Delete('admin/credential/:id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('attendance:biometric:enroll')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Biometric credential id' })
  @ApiOperation({ summary: 'Admin: permanently delete a biometric credential' })
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.biometricService.remove(tenantId, id);
  }

  // Attendance machine push — authenticated via HMAC device signature, NOT a user JWT.
  @Post('device/clock-in')
  @ApiHeader({ name: 'x-device-signature', required: true, description: 'HMAC-SHA256 of the signed payload' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @ApiOperation({ summary: 'Clock in from an attendance machine (fingerprint verified on-device)' })
  deviceClockIn(
    @TenantId() tenantId: string,
    @Headers('x-device-id') deviceId: string,
    @Headers('x-device-signature') signature: string,
    @Body() dto: DeviceClockInDto,
  ) {
    if (!signature) {
      throw new UnauthorizedException('Missing device signature');
    }
    return this.biometricService.deviceClockIn(tenantId, deviceId, dto, signature);
  }

  // Batch log ingestion (ADMS-style push, in/out, PIN→employee mapping).
  @Post('device/logs')
  @ApiHeader({ name: 'x-device-signature', required: true, description: 'HMAC-SHA256 of `${deviceId}|${canonicalJson}`' })
  @ApiHeader({ name: 'x-device-key', required: false, description: 'Per-device API key from registration' })
  @ApiOperation({ summary: 'Ingest batch attendance logs from a registered machine' })
  ingestDeviceLogs(
    @TenantId() tenantId: string,
    @Headers('x-device-id') deviceId: string,
    @Headers('x-device-key') apiKey: string | undefined,
    @Headers('x-device-signature') signature: string,
    @Body() body: { logs: Array<{ deviceId?: string; employeeId?: string; devicePin?: string; ts: number; direction: 'in' | 'out'; photo?: string }> },
  ) {
    if (!signature) {
      throw new UnauthorizedException('Missing device signature');
    }
    return this.biometricService.ingestDeviceLogs(tenantId, deviceId, apiKey, body?.logs ?? [], signature);
  }

  @Post('admin/devices')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('attendance:biometric:enroll')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: register a fingerprint machine (apiKey returned once)' })
  registerDevice(
    @TenantId() tenantId: string,
    @Body() dto: { deviceId: string; name: string; location?: string },
  ) {
    return this.biometricService.registerDevice(tenantId, dto);
  }

  @Post('admin/devices/:id/key/rotate')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('attendance:biometric:enroll')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: rotate machine API key (raw key returned once)' })
  rotateDeviceKey(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.biometricService.rotateDeviceKey(tenantId, id);
  }

  @Patch('admin/devices/:id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('attendance:biometric:enroll')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: activate/deactivate a machine' })
  setDeviceActive(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.biometricService.setDeviceActive(tenantId, id, body.isActive);
  }
}
