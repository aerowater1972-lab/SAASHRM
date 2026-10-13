import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CompensationService } from './compensation.service';
import {
  BulkAdjustmentDto,
  CreateAdjustmentDto,
  CreateReviewCycleDto,
  CreateSalaryStructureDto,
  SyncAdjustmentDto,
  UpdateSalaryStructureDto,
} from './dto/compensation.dto';

@ApiTags('Compensation Management')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('compensation')
export class CompensationController {
  constructor(private readonly comp: CompensationService) {}

  @Post('structures')
  @Permissions('compensation:manage')
  @ApiOperation({ summary: 'Buat salary structure (CM-01/CM-03)' })
  createStructure(@Req() req: any, @Body() dto: CreateSalaryStructureDto) {
    return this.comp.createStructure(req.user.tenantId, dto);
  }

  @Get('structures')
  @Permissions('compensation:view')
  @ApiOperation({ summary: 'Daftar salary structure' })
  listStructures(
    @Req() req: any,
    @Query('jobFamily') jobFamily?: string,
    @Query('grade') grade?: string,
  ) {
    return this.comp.listStructures(req.user.tenantId, { jobFamily, grade });
  }

  @Patch('structures/:id')
  @Permissions('compensation:manage')
  @ApiOperation({ summary: 'Update salary structure' })
  updateStructure(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSalaryStructureDto) {
    return this.comp.updateStructure(req.user.tenantId, id, dto);
  }

  @Delete('structures/:id')
  @Permissions('compensation:manage')
  @ApiOperation({ summary: 'Hapus (soft) salary structure' })
  deleteStructure(@Req() req: any, @Param('id') id: string) {
    return this.comp.deleteStructure(req.user.tenantId, id);
  }

  @Post('cycles')
  @Permissions('compensation:manage')
  @ApiOperation({ summary: 'Buat review cycle (CM-02)' })
  createCycle(@Req() req: any, @Body() dto: CreateReviewCycleDto) {
    return this.comp.createCycle(req.user.tenantId, req.user.id ?? req.user.sub, dto);
  }

  @Get('cycles')
  @Permissions('compensation:view')
  @ApiOperation({ summary: 'Daftar review cycle' })
  listCycles(@Req() req: any, @Query('status') status?: string) {
    return this.comp.listCycles(req.user.tenantId, { status });
  }

  @Get('cycles/:id')
  @Permissions('compensation:view')
  @ApiOperation({ summary: 'Detail cycle + budget tracking' })
  getCycle(@Req() req: any, @Param('id') id: string) {
    return this.comp.getCycle(req.user.tenantId, id);
  }

  @Post('cycles/:id/open')
  @Permissions('compensation:manage')
  @ApiOperation({ summary: 'Buka cycle DRAFT -> OPEN' })
  openCycle(@Req() req: any, @Param('id') id: string) {
    return this.comp.openCycle(req.user.tenantId, id);
  }

  @Post('cycles/:id/approve')
  @Permissions('compensation:approve')
  @ApiOperation({ summary: 'Approve cycle + bulk approve adjustment (CM-04)' })
  approveCycle(@Req() req: any, @Param('id') id: string) {
    return this.comp.approveCycle(req.user.tenantId, id, req.user.id ?? req.user.sub);
  }

  @Post('cycles/:id/close')
  @Permissions('compensation:manage')
  @ApiOperation({ summary: 'Tutup cycle' })
  closeCycle(@Req() req: any, @Param('id') id: string) {
    return this.comp.closeCycle(req.user.tenantId, id);
  }

  @Post('adjustments')
  @Permissions('compensation:manage')
  @ApiOperation({ summary: 'Buat individual adjustment (CM-04)' })
  createAdjustment(@Req() req: any, @Body() dto: CreateAdjustmentDto) {
    return this.comp.createAdjustment(req.user.tenantId, dto);
  }

  @Post('adjustments/bulk')
  @Permissions('compensation:manage')
  @ApiOperation({ summary: 'Bulk adjustment (maks 500 item)' })
  bulkAdjustments(@Req() req: any, @Body() dto: BulkAdjustmentDto) {
    return this.comp.bulkAdjustments(req.user.tenantId, dto);
  }

  @Post('adjustments/:id/approve')
  @Permissions('compensation:approve')
  @ApiOperation({ summary: 'Approve adjustment' })
  approveAdjustment(@Req() req: any, @Param('id') id: string) {
    return this.comp.approveAdjustment(req.user.tenantId, id, req.user.id ?? req.user.sub);
  }

  @Post('adjustments/:id/reject')
  @Permissions('compensation:approve')
  @ApiOperation({ summary: 'Reject adjustment' })
  rejectAdjustment(@Req() req: any, @Param('id') id: string) {
    return this.comp.rejectAdjustment(req.user.tenantId, id, req.user.id ?? req.user.sub);
  }

  @Post('adjustments/:id/sync-payroll')
  @Permissions('compensation:manage')
  @ApiOperation({ summary: 'Sync adjustment APPROVED ke payroll (CM-06)' })
  syncToPayroll(@Req() req: any, @Param('id') id: string, @Body() dto: SyncAdjustmentDto) {
    return this.comp.syncToPayroll(req.user.tenantId, id, dto?.description);
  }

  @Get('analytics/equity')
  @Permissions('compensation:view')
  @ApiOperation({ summary: 'Internal equity: compa-ratio vs struktur (CM-05)' })
  equity(
    @Req() req: any,
    @Query('jobFamily') jobFamily?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.comp.equityAnalysis(req.user.tenantId, { jobFamily, page, limit });
  }

  @Get('employees/:employeeId/total-rewards')
  @Permissions('compensation:view')
  @ApiOperation({ summary: 'Total rewards view per employee (CM-05)' })
  totalRewards(@Req() req: any, @Param('employeeId') employeeId: string) {
    return this.comp.totalRewards(req.user.tenantId, employeeId);
  }
}
