import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { EmploymentService } from '../services/employment.service';
import { CreateEmploymentDto } from '../dto/create-employment.dto';

@ApiTags('Employment')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller()
export class EmploymentController {
  constructor(private readonly employmentService: EmploymentService) {}

  @Post('employees/:employeeId/employments')
  @ApiOperation({ summary: 'Create employment record for employee' })
  create(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateEmploymentDto,
  ) {
    return this.employmentService.create(tenantId, employeeId, dto);
  }

  @Post('employments/:id/activate')
  @ApiOperation({ summary: 'Activate employment (PENDING_ACTIVATION → ACTIVE)' })
  activate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employmentService.activate(tenantId, id);
  }

  @Post('employments/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate employment (ACTIVE → INACTIVE)' })
  deactivate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employmentService.deactivate(tenantId, id);
  }
}
