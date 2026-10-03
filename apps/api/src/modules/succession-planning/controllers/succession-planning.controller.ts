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
import { SuccessionPlanningService } from '../services/succession-planning.service';
import {
  CreateTalentPoolDto,
  UpdateTalentPoolDto,
  AddPoolMemberDto,
  UpdatePoolMemberDto,
  CreateSuccessionPlanDto,
  UpdateSuccessionPlanDto,
  AddSuccessionCandidateDto,
  UpdateSuccessionCandidateDto,
} from '../dto/succession.dto';

@ApiTags('Succession Planning')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('succession')
export class SuccessionPlanningController {
  constructor(private readonly successionService: SuccessionPlanningService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Succession planning summary' })
  @Permissions('succession:view')
  summary(@TenantId() tenantId: string) {
    return this.successionService.summary(tenantId);
  }

  @Get('nine-box')
  @ApiOperation({ summary: 'Matriks 9-Box kinerja x potensi talent pool' })
  @Permissions('succession:view')
  nineBox(@TenantId() tenantId: string, @Query('poolId') poolId?: string) {
    return this.successionService.nineBoxMatrix(tenantId, poolId);
  }

  // ---------- Talent Pools ----------
  @Get('pools')
  @ApiOperation({ summary: 'List talent pools' })
  @Permissions('succession:view')
  listPools(@TenantId() tenantId: string, @Query('search') search?: string, @Query('status') status?: string) {
    return this.successionService.listPools(tenantId, { search, status });
  }

  @Get('pools/:id')
  @ApiOperation({ summary: 'Get talent pool with members' })
  @Permissions('succession:view')
  getPool(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.successionService.getPool(tenantId, id);
  }

  @Post('pools')
  @ApiOperation({ summary: 'Create a talent pool' })
  @Permissions('succession:manage')
  createPool(@TenantId() tenantId: string, @Body() dto: CreateTalentPoolDto) {
    return this.successionService.createPool(tenantId, dto);
  }

  @Put('pools/:id')
  @ApiOperation({ summary: 'Update a talent pool' })
  @Permissions('succession:manage')
  updatePool(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateTalentPoolDto) {
    return this.successionService.updatePool(tenantId, id, dto);
  }

  @Delete('pools/:id')
  @ApiOperation({ summary: 'Delete a talent pool' })
  @Permissions('succession:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePool(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.successionService.deletePool(tenantId, id);
  }

  @Post('pools/:id/members')
  @ApiOperation({ summary: 'Add member to talent pool' })
  @Permissions('succession:manage')
  addMember(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: AddPoolMemberDto) {
    return this.successionService.addMember(tenantId, id, user.sub, dto);
  }

  @Put('pools/:id/members/:employeeId')
  @ApiOperation({ summary: 'Update pool member' })
  @Permissions('succession:manage')
  updateMember(@TenantId() tenantId: string, @Param('id') id: string, @Param('employeeId') employeeId: string, @Body() dto: UpdatePoolMemberDto) {
    return this.successionService.updateMember(tenantId, id, employeeId, dto);
  }

  @Delete('pools/:id/members/:employeeId')
  @ApiOperation({ summary: 'Remove member from talent pool' })
  @Permissions('succession:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@TenantId() tenantId: string, @Param('id') id: string, @Param('employeeId') employeeId: string) {
    return this.successionService.removeMember(tenantId, id, employeeId);
  }

  // ---------- Succession Plans ----------
  @Get('plans')
  @ApiOperation({ summary: 'List succession plans' })
  @Permissions('succession:view')
  listPlans(@TenantId() tenantId: string, @Query('status') status?: string, @Query('departmentId') departmentId?: string, @Query('search') search?: string) {
    return this.successionService.listPlans(tenantId, { status, departmentId, search });
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get succession plan detail' })
  @Permissions('succession:view')
  getPlan(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.successionService.getPlan(tenantId, id);
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a succession plan' })
  @Permissions('succession:manage')
  createPlan(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateSuccessionPlanDto) {
    return this.successionService.createPlan(tenantId, user.sub, dto);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update a succession plan' })
  @Permissions('succession:manage')
  updatePlan(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateSuccessionPlanDto) {
    return this.successionService.updatePlan(tenantId, id, dto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Delete a succession plan' })
  @Permissions('succession:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePlan(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.successionService.deletePlan(tenantId, id);
  }

  // ---------- Candidates ----------
  @Post('plans/:id/candidates')
  @ApiOperation({ summary: 'Add a candidate to succession plan' })
  @Permissions('succession:manage')
  addCandidate(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: AddSuccessionCandidateDto) {
    return this.successionService.addCandidate(tenantId, id, user.sub, dto);
  }

  @Put('plans/:id/candidates/:candidateId')
  @ApiOperation({ summary: 'Update a succession candidate' })
  @Permissions('succession:manage')
  updateCandidate(@TenantId() tenantId: string, @Param('id') id: string, @Param('candidateId') candidateId: string, @Body() dto: UpdateSuccessionCandidateDto) {
    return this.successionService.updateCandidate(tenantId, id, candidateId, dto);
  }

  @Delete('plans/:id/candidates/:candidateId')
  @ApiOperation({ summary: 'Remove a succession candidate' })
  @Permissions('succession:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCandidate(@TenantId() tenantId: string, @Param('id') id: string, @Param('candidateId') candidateId: string) {
    return this.successionService.removeCandidate(tenantId, id, candidateId);
  }
}