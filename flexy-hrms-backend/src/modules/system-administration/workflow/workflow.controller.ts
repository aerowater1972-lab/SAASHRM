import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthzGuard } from '@common/guards/authz.guard';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '@common/decorators/current-user.decorator';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';

@ApiTags('workflow')
@Controller('admin/workflows')
@UseGuards(AuthzGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @RequirePermission({ module: 'workflow', action: 'create' })
  @ApiOperation({ summary: 'Membuat/memperbarui definisi workflow approval (versioned)' })
  async create(@Body() dto: CreateWorkflowDefinitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workflowService.createOrNewVersion(user.tenantId, dto, user.userId);
  }

  @Get('active')
  @RequirePermission({ module: 'workflow', action: 'read' })
  async getActive(@CurrentUser() user: AuthenticatedUser, @Query('processType') processType: string) {
    return this.workflowService.getActiveDefinition(user.tenantId, processType);
  }
}
