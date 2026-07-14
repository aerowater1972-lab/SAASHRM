import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CycleService } from '../services/cycle.service';
import { CreateCycleDto } from '../dto/create-cycle.dto';
import { CycleListQueryDto } from '../dto/cycle-list-query.dto';
import { CycleStatus } from '@prisma/client';

@ApiTags('Performance - Review Cycles')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('performance/cycles')
export class CycleController {
  constructor(private readonly cycleService: CycleService) {}

  @Post()
  @Permissions('performance:cycle:create')
  @ApiOperation({ summary: 'Create a new review cycle' })
  create(@TenantId() tenantId: string, @Body() dto: CreateCycleDto) {
    return this.cycleService.create(tenantId, dto);
  }

  @Get()
  @Permissions('performance:cycle:read')
  @ApiOperation({ summary: 'Get all review cycles' })
  @ApiQuery({ name: 'status', required: false, enum: CycleStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: CycleListQueryDto,
  ) {
    return this.cycleService.findAll(tenantId, filters);
  }

  @Get(':id')
  @Permissions('performance:cycle:read')
  @ApiOperation({ summary: 'Get review cycle by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.cycleService.findOne(tenantId, id);
  }

  @Put(':id')
  @Permissions('performance:cycle:update')
  @ApiOperation({ summary: 'Update review cycle' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCycleDto>,
  ) {
    return this.cycleService.update(tenantId, id, dto);
  }

  @Post(':id/start')
  @Permissions('performance:cycle:start')
  @ApiOperation({ summary: 'Start a review cycle (UPCOMING -> IN_PROGRESS)' })
  start(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.cycleService.start(tenantId, id);
  }

  @Post(':id/complete')
  @Permissions('performance:cycle:complete')
  @ApiOperation({ summary: 'Complete a review cycle (IN_PROGRESS -> COMPLETED)' })
  complete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.cycleService.complete(tenantId, id);
  }
}
