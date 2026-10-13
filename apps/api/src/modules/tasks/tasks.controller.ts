import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TasksService } from './tasks.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddProjectMemberDto,
  CreateTaskDto,
  UpdateTaskDto,
  AddTaskCommentDto,
  LogTaskHoursDto,
  AddTaskDependencyDto,
} from './dto/tasks.dto';

@ApiTags('Task & Project Management')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  // ==========================
  // PROJECTS
  // ==========================

  @Get('projects')
  @Permissions('tasks:view')
  @ApiOperation({ summary: 'Daftar project (paginasi + filter status/q)' })
  listProjects(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.tasks.listProjects(req.user.tenantId, { status, q, page, limit });
  }

  @Get('projects/:id')
  @Permissions('tasks:view')
  @ApiOperation({ summary: 'Detail project + member + task count' })
  getProject(@Req() req: any, @Param('id') id: string) {
    return this.tasks.getProject(req.user.tenantId, id);
  }

  @Post('projects')
  @Permissions('tasks:manage')
  @ApiOperation({ summary: 'Buat project baru' })
  createProject(@Req() req: any, @Body() body: CreateProjectDto) {
    return this.tasks.createProject(req.user.tenantId, body);
  }

  @Patch('projects/:id')
  @Permissions('tasks:manage')
  @ApiOperation({ summary: 'Ubah project' })
  updateProject(@Req() req: any, @Param('id') id: string, @Body() body: UpdateProjectDto) {
    return this.tasks.updateProject(req.user.tenantId, id, body);
  }

  @Post('projects/:id/delete')
  @Permissions('tasks:manage')
  @ApiOperation({ summary: 'Hapus project (soft delete)' })
  deleteProject(@Req() req: any, @Param('id') id: string) {
    return this.tasks.deleteProject(req.user.tenantId, id);
  }

  @Post('projects/:id/members')
  @Permissions('tasks:manage')
  @ApiOperation({ summary: 'Tambah anggota project' })
  addMember(@Req() req: any, @Param('id') id: string, @Body() body: AddProjectMemberDto) {
    return this.tasks.addMember(req.user.tenantId, id, body);
  }

  // ==========================
  // TASKS
  // ==========================

  @Get()
  @Permissions('tasks:view')
  @ApiOperation({ summary: 'Daftar task (paginasi + filter project/assignee/status/q)' })
  listTasks(
    @Req() req: any,
    @Query('projectId') projectId?: string,
    @Query('assigneeEmployeeId') assigneeEmployeeId?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit = 25,
  ) {
    return this.tasks.listTasks(req.user.tenantId, { projectId, assigneeEmployeeId, status, q, page, limit });
  }

  @Get('stats')
  @Permissions('tasks:view')
  @ApiOperation({ summary: 'Statistik task (total, overdue, per status)' })
  stats(@Req() req: any) {
    return this.tasks.stats(req.user.tenantId);
  }

  @Get('my')
  @Permissions('tasks:view')
  @ApiOperation({ summary: 'Task milik saya (assignee = employee login) + ringkasan overdue/hari ini' })
  myTasks(@Req() req: any) {
    return this.tasks.myTasks(req.user.tenantId, req.user.employeeId ?? null);
  }

  @Post(':id/log-hours')
  @Permissions('tasks:create')
  @ApiOperation({ summary: 'Catat jam kerja aktual (time tracking) pada task' })
  logHours(@Req() req: any, @Param('id') id: string, @Body() body: LogTaskHoursDto) {
    return this.tasks.logHours(req.user.tenantId, id, body.hours);
  }

  @Get('completion-rate')
  @Permissions('tasks:view')
  @ApiOperation({ summary: 'TM-07: completion rate tugas karyawan (feed performance review)' })
  completionRate(
    @Req() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const empId = employeeId ?? req.user.employeeId;
    if (!empId) throw new BadRequestException('employeeId wajib diisi');
    return this.tasks.completionRate(req.user.tenantId, empId, from, to);
  }

  @Get('gantt')
  @Permissions('tasks:view')
  @ApiOperation({ summary: 'TM-04: data Gantt board — seluruh task + edge dependency (satu respons)' })
  ganttBoard(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.tasks.ganttBoard(req.user.tenantId, projectId);
  }

  @Get(':id/dependencies')
  @Permissions('tasks:view')
  @ApiOperation({ summary: 'Dependency task (blockedBy + blocking) — data Gantt TM-04' })
  listDependencies(@Req() req: any, @Param('id') id: string) {
    return this.tasks.listDependencies(req.user.tenantId, id);
  }

  @Post(':id/dependencies')
  @Permissions('tasks:manage')
  @ApiOperation({ summary: 'Tambah dependency: task ini diblokir task lain sampai selesai' })
  addDependency(@Req() req: any, @Param('id') id: string, @Body() body: AddTaskDependencyDto) {
    return this.tasks.addDependency(req.user.tenantId, id, body);
  }

  @Post('dependencies/:depId/delete')
  @Permissions('tasks:manage')
  @ApiOperation({ summary: 'Hapus dependency' })
  removeDependency(@Req() req: any, @Param('depId') depId: string) {
    return this.tasks.removeDependency(req.user.tenantId, depId);
  }

  @Get(':id')
  @Permissions('tasks:view')
  @ApiOperation({ summary: 'Detail task + komentar + subtask' })
  getTask(@Req() req: any, @Param('id') id: string) {
    return this.tasks.getTask(req.user.tenantId, id);
  }

  @Post()
  @Permissions('tasks:create')
  @ApiOperation({ summary: 'Buat task baru' })
  createTask(@Req() req: any, @Body() body: CreateTaskDto) {
    return this.tasks.createTask(req.user.tenantId, req.user.sub, body);
  }

  @Patch(':id')
  @Permissions('tasks:create')
  @ApiOperation({ summary: 'Ubah task (termasuk ubah status/drag)' })
  updateTask(@Req() req: any, @Param('id') id: string, @Body() body: UpdateTaskDto) {
    return this.tasks.updateTask(req.user.tenantId, id, body);
  }

  @Post(':id/delete')
  @Permissions('tasks:create')
  @ApiOperation({ summary: 'Hapus task (soft delete)' })
  deleteTask(@Req() req: any, @Param('id') id: string) {
    return this.tasks.deleteTask(req.user.tenantId, id);
  }

  @Post(':id/comments')
  @Permissions('tasks:create')
  @ApiOperation({ summary: 'Tambah komentar pada task' })
  addComment(@Req() req: any, @Param('id') id: string, @Body() body: AddTaskCommentDto) {
    return this.tasks.addComment(
      req.user.tenantId,
      id,
      { employeeId: req.user.employeeId ?? null, userId: req.user.sub },
      body,
    );
  }
}
