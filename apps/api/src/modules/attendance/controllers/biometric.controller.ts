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
import { EnrollBiometricDto, VerifyFaceDto, DeviceClockInDto, AdminEnrollBiometricDto } from '../dto/biometric.dto';

@ApiTags('Attendance - Biometric')
@Controller('attendance/biometric')
export class BiometricController {
  constructor(private readonly biometricService: BiometricService) {}

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
    return this.biometricService.verifyFace(tenantId, employeeId, dto.embedding);
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
}
