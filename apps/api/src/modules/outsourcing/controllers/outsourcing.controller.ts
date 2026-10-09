import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OutsourcingService } from '../services/outsourcing.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CreateOutsourcingVendorDto, UpdateOutsourcingVendorDto, CreateOutsourcingContractDto, UpdateOutsourcingContractDto, CreateOutsourcedWorkerDto, UpdateOutsourcedWorkerDto, CreateOutsourcedAttendanceDto, CreateOutsourcedCostLogDto, UpdateOutsourcedCostLogDto } from '../dto/outsourcing.dto';

@ApiTags('Outsourcing / EOR')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('outsourcing')
export class OutsourcingController {
  constructor(private readonly outsourcingService: OutsourcingService) {}

  // ========== VENDOR ==========

  @Post('vendors')
  @Permissions('outsourcing:vendor:create')
  @ApiOperation({ summary: 'Create outsourcing vendor' })
  createVendor(@TenantId() tenantId: string, @Body() dto: CreateOutsourcingVendorDto) {
    return this.outsourcingService.createVendor(tenantId, dto);
  }

  @Get('vendors')
  @Permissions('outsourcing:vendor:read')
  @ApiOperation({ summary: 'List outsourcing vendors' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'] })
  getVendors(@TenantId() tenantId: string, @Query('status') status?: string) {
    return this.outsourcingService.getVendors(tenantId, status as any);
  }

  @Get('vendors/summary')
  @Permissions('outsourcing:vendor:read')
  @ApiOperation({ summary: 'Get vendor summary statistics' })
  getVendorSummary(@TenantId() tenantId: string) {
    return this.outsourcingService.getVendorSummary(tenantId);
  }

  @Get('vendors/:id')
  @Permissions('outsourcing:vendor:read')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  getVendor(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.outsourcingService.getVendor(tenantId, id);
  }

  @Put('vendors/:id')
  @Permissions('outsourcing:vendor:update')
  @ApiOperation({ summary: 'Update vendor' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  updateVendor(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateOutsourcingVendorDto) {
    return this.outsourcingService.updateVendor(tenantId, id, dto);
  }

  @Delete('vendors/:id')
  @Permissions('outsourcing:vendor:delete')
  @ApiOperation({ summary: 'Delete vendor (soft delete)' })
  @ApiParam({ name: 'id', description: 'Vendor ID' })
  deleteVendor(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.outsourcingService.deleteVendor(tenantId, id);
  }

  // ========== CONTRACT ==========

  @Post('contracts')
  @Permissions('outsourcing:contract:create')
  @ApiOperation({ summary: 'Create outsourcing contract' })
  createContract(@TenantId() tenantId: string, @Body() dto: CreateOutsourcingContractDto) {
    return this.outsourcingService.createContract(tenantId, dto);
  }

  @Get('contracts')
  @Permissions('outsourcing:contract:read')
  @ApiOperation({ summary: 'List outsourcing contracts' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'] })
  getContracts(@TenantId() tenantId: string, @Query('vendorId') vendorId?: string, @Query('status') status?: string) {
    return this.outsourcingService.getContracts(tenantId, vendorId, status as any);
  }

  @Get('contracts/:id')
  @Permissions('outsourcing:contract:read')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  getContract(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.outsourcingService.getContract(tenantId, id);
  }

  @Put('contracts/:id')
  @Permissions('outsourcing:contract:update')
  @ApiOperation({ summary: 'Update contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  updateContract(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateOutsourcingContractDto) {
    return this.outsourcingService.updateContract(tenantId, id, dto);
  }

  @Delete('contracts/:id')
  @Permissions('outsourcing:contract:delete')
  @ApiOperation({ summary: 'Delete contract (soft delete)' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  deleteContract(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.outsourcingService.deleteContract(tenantId, id);
  }

  // ========== WORKER ==========

  @Post('workers')
  @Permissions('outsourcing:worker:create')
  @ApiOperation({ summary: 'Create outsourced worker' })
  createWorker(@TenantId() tenantId: string, @Body() dto: CreateOutsourcedWorkerDto) {
    return this.outsourcingService.createWorker(tenantId, dto);
  }

  @Get('workers')
  @Permissions('outsourcing:worker:read')
  @ApiOperation({ summary: 'List outsourced workers' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'contractId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'] })
  getWorkers(@TenantId() tenantId: string, @Query('vendorId') vendorId?: string, @Query('contractId') contractId?: string, @Query('status') status?: string) {
    return this.outsourcingService.getWorkers(tenantId, vendorId, contractId, status as any);
  }

  @Get('workers/:id')
  @Permissions('outsourcing:worker:read')
  @ApiOperation({ summary: 'Get worker by ID' })
  @ApiParam({ name: 'id', description: 'Worker ID' })
  getWorker(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.outsourcingService.getWorker(tenantId, id);
  }

  @Put('workers/:id')
  @Permissions('outsourcing:worker:update')
  @ApiOperation({ summary: 'Update worker' })
  @ApiParam({ name: 'id', description: 'Worker ID' })
  updateWorker(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateOutsourcedWorkerDto) {
    return this.outsourcingService.updateWorker(tenantId, id, dto);
  }

  @Delete('workers/:id')
  @Permissions('outsourcing:worker:delete')
  @ApiOperation({ summary: 'Delete worker (soft delete + terminate)' })
  @ApiParam({ name: 'id', description: 'Worker ID' })
  deleteWorker(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.outsourcingService.deleteWorker(tenantId, id);
  }

  // ========== ATTENDANCE ==========

  @Post('attendances')
  @Permissions('outsourcing:attendance:create')
  @ApiOperation({ summary: 'Record worker attendance' })
  createAttendance(@TenantId() tenantId: string, @Body() dto: any) {
    return this.outsourcingService.createAttendance(tenantId, dto);
  }

  @Get('attendances')
  @Permissions('outsourcing:attendance:read')
  @ApiOperation({ summary: 'List attendances' })
  @ApiQuery({ name: 'workerId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getAttendances(@TenantId() tenantId: string, @Query('workerId') workerId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.outsourcingService.getAttendances(tenantId, workerId, from, to);
  }

  // ========== COST LOG ==========

  @Post('cost-logs')
  @Permissions('outsourcing:cost:create')
  @ApiOperation({ summary: 'Create cost log' })
  createCostLog(@TenantId() tenantId: string, @Body() dto: any) {
    return this.outsourcingService.createCostLog(tenantId, dto);
  }

  @Get('cost-logs')
  @Permissions('outsourcing:cost:read')
  @ApiOperation({ summary: 'List cost logs' })
  @ApiQuery({ name: 'workerId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'PAID', 'REJECTED'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getCostLogs(@TenantId() tenantId: string, @Query('workerId') workerId?: string, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.outsourcingService.getCostLogs(tenantId, workerId, status, from, to);
  }

  @Put('cost-logs/:id')
  @Permissions('outsourcing:cost:update')
  @ApiOperation({ summary: 'Update cost log' })
  @ApiParam({ name: 'id', description: 'Cost log ID' })
  updateCostLog(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.outsourcingService.updateCostLog(tenantId, id, dto);
  }

  @Post('cost-logs/:id/approve')
  @Permissions('outsourcing:cost:approve')
  @ApiOperation({ summary: 'Approve cost log' })
  @ApiParam({ name: 'id', description: 'Cost log ID' })
  approveCostLog(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.outsourcingService.approveCostLog(tenantId, id);
  }

  @Post('cost-logs/:id/pay')
  @Permissions('outsourcing:cost:pay')
  @ApiOperation({ summary: 'Mark cost log as paid' })
  @ApiParam({ name: 'id', description: 'Cost log ID' })
  payCostLog(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: { invoiceRef?: string }) {
    return this.outsourcingService.payCostLog(tenantId, id, dto.invoiceRef);
  }

  // ========== SUMMARY ==========

  @Get('summary')
  @Permissions('outsourcing:read')
  @ApiOperation({ summary: 'Get outsourcing summary statistics' })
  getSummary(@TenantId() tenantId: string) {
    return this.outsourcingService.getVendorSummary(tenantId);
  }
}