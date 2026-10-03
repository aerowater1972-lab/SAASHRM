import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser, JwtUser } from '@common/decorators/current-user.decorator';
import { ShiftRotationService } from '../services/shift-rotation.service';

@ApiTags('Attendance - Shift Rotation')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('attendance/shift-rotation')
export class ShiftRotationController {
  constructor(private readonly shiftRotationService: ShiftRotationService) {}

  @Post('trigger')
  @Permissions('attendance:shift-rotation:trigger')
  @ApiOperation({ summary: 'Manually trigger shift rotation for a shift group' })
  async triggerRotation(
    @TenantId() tenantId: string,
    @Body() dto: { shiftGroupId: string; daysAhead?: number },
  ) {
    return this.shiftRotationService.triggerRotation(tenantId, dto.shiftGroupId, dto.daysAhead ?? 7);
  }

  @Get('schedule')
  @Permissions('attendance:shift-rotation:read')
  @ApiOperation({ summary: 'Get rotation schedule for a shift group' })
  getRotationSchedule(
    @TenantId() tenantId: string,
    @Query('shiftGroupId') shiftGroupId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.shiftRotationService.getRotationSchedule(
      tenantId,
      shiftGroupId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('employee-shift')
  @Permissions('attendance:shift-rotation:read')
  @ApiOperation({ summary: 'Get employee shift on specific date' })
  getEmployeeShift(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId: string,
    @Query('date') date: string,
  ) {
    return this.shiftRotationService.getEmployeeShiftOnDate(
      tenantId,
      employeeId,
      new Date(date),
    );
  }
}