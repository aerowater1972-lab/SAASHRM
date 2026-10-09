import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Req,
  UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Public } from '@common/decorators/public.decorator';
import { SkipCsrf } from '@common/decorators/skip-csrf.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { TenantId } from '@common/decorators/tenant.decorator';
import { AssetService } from '../services/asset.service';
import { CreateAssetDto, UpdateAssetDto } from '../dto/create-asset.dto';
import { AssignAssetDto, ReturnAssetDto } from '../dto/assign-asset.dto';
import { AssetListQueryDto } from '../dto/asset-list-query.dto';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  @Permissions('assets:create')
  @ApiOperation({ summary: 'Create a new asset' })
  create(@TenantId() tenantId: string, @Body() dto: CreateAssetDto) {
    return this.assetService.create(tenantId, dto);
  }

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get all assets with filters' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: AssetListQueryDto,
  ) {
    return this.assetService.findAll(tenantId, filters);
  }

  @Get('summary')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset summary by category/status' })
  summary(@TenantId() tenantId: string) {
    return this.assetService.summary(tenantId);
  }

  @Get('employee/:employeeId')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get assets assigned to an employee' })
  findByEmployee(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.assetService.findByEmployee(tenantId, employeeId);
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.assetService.findOne(tenantId, id);
  }

  @Put(':id')
  @Permissions('assets:update')
  @ApiOperation({ summary: 'Update asset' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('assets:delete')
  @ApiOperation({ summary: 'Soft delete asset' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.assetService.remove(tenantId, id);
  }

  @Post(':id/assign')
  @Permissions('assets:assign')
  @ApiOperation({ summary: 'Assign asset to an employee' })
  assign(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignAssetDto,
  ) {
    return this.assetService.assign(tenantId, id, dto);
  }

  @Post(':id/return')
  @Permissions('assets:assign')
  @ApiOperation({ summary: 'Return asset from employee' })
  returnAsset(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReturnAssetDto,
  ) {
    return this.assetService.returnAsset(tenantId, id, dto);
  }

  @Get(':id/history')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get assignment history for an asset' })
  getHistory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.assetService.getHistory(tenantId, id);
  }

  @Get(':id/qr')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Download QR PNG inventaris (payload = URL verifikasi publik)' })
  async getQr(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const base = `${req.protocol}://${req.get('host')}/api/v1`;
    const qr = await this.assetService.getQrPng(tenantId, id, base);
    res.setHeader('Content-Type', qr.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${qr.filename}"`);
    res.send(Buffer.from(qr.data, 'base64'));
  }

  @Get('verify/:token')
  @Public()
  @SkipCsrf()
  @ApiOperation({ summary: 'Verifikasi publik aset via QR (tanpa PII)' })
  verify(@Param('token') token: string) {
    return this.assetService.verifyByToken(token);
  }

  @Post('depreciation/run')
  @Permissions('assets:update')
  @ApiOperation({ summary: 'Posting depresiasi bulanan (idempoten)' })
  runDepreciation(
    @TenantId() tenantId: string,
    @Body() data: { year: number; month: number },
  ) {
    return this.assetService.runDepreciation(tenantId, Number(data.year), Number(data.month));
  }

  @Get(':id/depreciation')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Jadwal + nilai buku depresiasi aset' })
  getDepreciation(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.assetService.getDepreciationSchedule(tenantId, id);
  }
}
