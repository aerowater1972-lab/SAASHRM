import { Controller, Get, Post, Put, Delete, Body, Param, Query , UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { ComponentService } from '../services/component.service';
import { CreateComponentDto } from '../dto/create-component.dto';

@ApiTags('Payroll - Components')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/components')
export class ComponentController {
  constructor(private readonly componentService: ComponentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a payroll component' })
  create(@TenantId() tenantId: string, @Body() dto: CreateComponentDto) {
    return this.componentService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payroll components' })
  @ApiQuery({ name: 'type', required: false, enum: ['EARNING', 'DEDUCTION'] })
  @ApiQuery({ name: 'category', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
  ) {
    return this.componentService.findAll(tenantId, type, category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payroll component by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.componentService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update payroll component' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateComponentDto>,
  ) {
    return this.componentService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payroll component' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.componentService.remove(tenantId, id);
  }
}
