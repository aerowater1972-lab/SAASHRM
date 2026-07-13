import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from '../services/workflow.service';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';

@ApiTags('Admin - Workflows')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('admin/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @Permissions('admin:workflow:create')
  @ApiOperation({ summary: 'Create a new workflow definition' })
  create(@TenantId() tenantId: string, @Body() dto: CreateWorkflowDto) {
    return this.workflowService.create(tenantId, dto);
  }

  @Get()
  @Permissions('admin:workflow:read')
  @ApiOperation({ summary: 'List all workflow definitions' })
  findAll(@TenantId() tenantId: string) {
    return this.workflowService.findAll(tenantId);
  }

  @Put(':id')
  @Permissions('admin:workflow:update')
  @ApiOperation({ summary: 'Update workflow definition' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: CreateWorkflowDto) {
    return this.workflowService.update(tenantId, id, dto);
  }

  @Post(':id/activate')
  @Permissions('admin:workflow:update')
  @ApiOperation({ summary: 'Toggle workflow active/inactive status' })
  activate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.workflowService.activate(tenantId, id);
  }
}

@ApiTags('Admin - Workflow Instances')
@ApiBearerAuth()
@Controller('admin/workflow-instances')
export class WorkflowInstanceController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get(':id')
  @Permissions('admin:workflow:read')
  @ApiOperation({ summary: 'Get workflow instance by ID' })
  getInstance(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.workflowService.getInstance(tenantId, id);
  }
}
