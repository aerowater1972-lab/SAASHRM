import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ShiftService } from '../services/shift.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { CreateRosterDto } from '../dto/create-roster.dto';
import { RosterEntryDto } from '../dto/roster-entry.dto';
import { ShiftSwapDto } from '../dto/shift-swap.dto';
import { CreateHolidayDto } from '../dto/create-holiday.dto';

@ApiTags('Shifts & Rosters')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('attendance')
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Post('shifts')
  @Permissions('shifts:create')
  @ApiOperation({ summary: 'Create a new shift' })
  createShift(@TenantId() tenantId: string, @Body() dto: CreateShiftDto) {
    return this.shiftService.createShift(tenantId, dto);
  }

  @Get('shifts')
  @Permissions('shifts:read')
  @ApiOperation({ summary: 'Get all shifts' })
  findAllShifts(@TenantId() tenantId: string) {
    return this.shiftService.findAllShifts(tenantId);
  }

  @Get('shifts/:id')
  @Permissions('shifts:read')
  @ApiOperation({ summary: 'Get shift by ID' })
  findOneShift(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.shiftService.findOneShift(tenantId, id);
  }

  @Put('shifts/:id')
  @Permissions('shifts:update')
  @ApiOperation({ summary: 'Update shift' })
  updateShift(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateShiftDto>,
  ) {
    return this.shiftService.updateShift(tenantId, id, dto);
  }

  @Delete('shifts/:id')
  @Permissions('shifts:delete')
  @ApiOperation({ summary: 'Delete shift (soft)' })
  deleteShift(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.shiftService.deleteShift(tenantId, id);
  }

  @Post('rosters')
  @Permissions('rosters:create')
  @ApiOperation({ summary: 'Create a new roster' })
  createRoster(@TenantId() tenantId: string, @Body() dto: CreateRosterDto) {
    return this.shiftService.createRoster(tenantId, dto);
  }

  @Get('rosters')
  @Permissions('rosters:read')
  @ApiOperation({ summary: 'Get all rosters' })
  findAllRosters(@TenantId() tenantId: string) {
    return this.shiftService.findAllRosters(tenantId);
  }

  @Get('rosters/:id')
  @Permissions('rosters:read')
  @ApiOperation({ summary: 'Get roster by ID with entries' })
  findOneRoster(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.shiftService.findOneRoster(tenantId, id);
  }

  @Post('rosters/:id/entries')
  @Permissions('rosters:update')
  @ApiOperation({ summary: 'Bulk assign shifts to roster' })
  addRosterEntries(
    @TenantId() tenantId: string,
    @Param('id') rosterId: string,
    @Body() dto: RosterEntryDto,
  ) {
    return this.shiftService.addRosterEntries(tenantId, rosterId, dto);
  }

  @Post('rosters/:id/swap')
  @Permissions('rosters:update')
  @ApiOperation({ summary: 'Request shift swap' })
  requestShiftSwap(
    @TenantId() tenantId: string,
    @Param('id') rosterEntryId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: ShiftSwapDto,
  ) {
    return this.shiftService.requestShiftSwap(tenantId, rosterEntryId, employeeId, dto);
  }

  @Post('holidays')
  @Permissions('holidays:create')
  @ApiOperation({ summary: 'Create a holiday' })
  createHoliday(@TenantId() tenantId: string, @Body() dto: CreateHolidayDto) {
    return this.shiftService.createHoliday(tenantId, dto);
  }

  @Get('holidays')
  @Permissions('holidays:read')
  @ApiOperation({ summary: 'Get holidays with filters' })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  findHolidays(
    @TenantId() tenantId: string,
    @Query('year') year?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.shiftService.findHolidays(tenantId, year ? parseInt(year, 10) : undefined, entityId);
  }
}
