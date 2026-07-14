import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeFilterDto } from '../dto/employee-filter.dto';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @Permissions('employee:create')
  @ApiOperation({ summary: 'Create a new employee' })
  create(@TenantId() tenantId: string, @Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(tenantId, dto);
  }

  @Get()
  @Permissions('employee:read')
  @ApiOperation({ summary: 'Get all employees with filters' })
  findAll(@TenantId() tenantId: string, @Query() filters: EmployeeFilterDto) {
    return this.employeeService.findAll(tenantId, filters);
  }

  @Get('export')
  @Permissions('employee:read')
  @ApiOperation({ summary: 'Export employees data' })
  export(@TenantId() tenantId: string, @Query() filters: EmployeeFilterDto) {
    return this.employeeService.export(tenantId, filters);
  }

  @Get(':id')
  @Permissions('employee:read')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employeeService.findOne(tenantId, id);
  }

  @Put(':id')
  @Permissions('employee:update')
  @ApiOperation({ summary: 'Update employee' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(tenantId, id, dto);
  }

  @Post(':id/activate')
  @Permissions('employee:update')
  @ApiOperation({ summary: 'Activate employee (PENDING_ACTIVATION → ACTIVE)' })
  activate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employeeService.activate(tenantId, id);
  }

  @Post(':id/deactivate')
  @Permissions('employee:update')
  @ApiOperation({ summary: 'Deactivate employee (ACTIVE → INACTIVE)' })
  deactivate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employeeService.deactivate(tenantId, id);
  }

  @Delete(':id')
  @Permissions('employee:delete')
  @ApiOperation({ summary: 'Soft delete employee' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employeeService.remove(tenantId, id);
  }

  @Post(':id/documents')
  @Permissions('employee:create')
  @ApiOperation({ summary: 'Upload employee document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
    @Query('notes') notes?: string,
  ) {
    return this.employeeService.uploadDocument(tenantId, id, file, type, notes);
  }

  @Get(':id/documents')
  @Permissions('employee:read')
  @ApiOperation({ summary: 'Get employee documents' })
  getDocuments(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employeeService.getDocuments(tenantId, id);
  }

  @Get(':id/employments')
  @Permissions('employee:read')
  @ApiOperation({ summary: 'Get employee employment history' })
  getEmploymentHistory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employeeService.getEmploymentHistory(tenantId, id);
  }

  @Post('bulk-import')
  @Permissions('employee:create')
  @ApiOperation({ summary: 'Bulk import employees' })
  bulkImport(@TenantId() tenantId: string, @Body() employees: CreateEmployeeDto[]) {
    return this.employeeService.bulkImport(tenantId, employees);
  }
}
