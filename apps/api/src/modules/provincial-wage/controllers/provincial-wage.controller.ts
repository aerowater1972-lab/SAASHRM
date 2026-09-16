import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ProvincialWageService } from '../services/provincial-wage.service';
import { CreateWageDto, UpdateWageDto, WageCalculationQueryDto } from '../dto/provincial-wage.dto';

@ApiTags('Provincial Wage (UMK/UMP)')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('wage/provincial')
export class ProvincialWageController {
  constructor(private readonly wageService: ProvincialWageService) {}

  @Get()
  @ApiOperation({ summary: 'List provincial wage entries' })
  @Permissions('wage:view')
  findAll(@TenantId() tenantId: string, @Query('province') province?: string, @Query('year') year?: number) {
    return this.wageService.findAll(tenantId, { province, year });
  }

  @Get('calculate')
  @ApiOperation({ summary: 'Calculate minimum wage for an employee' })
  @Permissions('wage:view')
  calculate(@TenantId() tenantId: string, @Query('employeeId') employeeId: string, @Query('periodYear') periodYear?: number) {
    return this.wageService.calculateMinimumWage(tenantId, employeeId, periodYear);
  }

  @Get('lookup/:province/:year')
  @ApiOperation({ summary: 'Lookup wage by province and year' })
  @Permissions('wage:view')
  lookup(@TenantId() tenantId: string, @Param('province') province: string, @Param('year') year: number) {
    return this.wageService.lookup(tenantId, province, year);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get wage statistics' })
  @Permissions('wage:view')
  getStats(@TenantId() tenantId: string, @Query('year') year?: number) {
    return this.wageService.getStats(tenantId, year);
  }

  @Get('compliance')
  @ApiOperation({ summary: 'Kepatuhan UMK: karyawan di bawah upah minimum (PP 36/2021)' })
  @Permissions('wage:view')
  checkCompliance(@TenantId() tenantId: string, @Query('year') year?: number) {
    return this.wageService.checkCompliance(tenantId, year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wage entry by ID' })
  @Permissions('wage:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.wageService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a provincial wage entry' })
  @Permissions('wage:manage')
  create(@TenantId() tenantId: string, @Body() dto: CreateWageDto) {
    return this.wageService.create(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a provincial wage entry' })
  @Permissions('wage:manage')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateWageDto) {
    return this.wageService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a provincial wage entry' })
  @Permissions('wage:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.wageService.delete(tenantId, id);
  }
}