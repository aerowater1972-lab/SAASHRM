import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddProjectMemberDto,
  CreateTaskDto,
  UpdateTaskDto,
  AddTaskCommentDto,
} from './dto/tasks.dto';

const PROJECT_INCLUDE = {
  owner: { select: { id: true, fullName: true, email: true } },
  department: { select: { id: true, name: true } },
  members: { include: { employee: { select: { id: true, fullName: true } } } },
  _count: { select: { tasks: true } },
} as const;

const TASK_INCLUDE = {
  project: { select: { id: true, name: true, code: true } },
  assignee: { select: { id: true, fullName: true } },
  reporter: { select: { id: true, fullName: true } },
  subtasks: { select: { id: true, title: true, status: true } },
  comments: {
    orderBy: { createdAt: 'asc' },
    include: {
      authorEmployee: { select: { id: true, fullName: true } },
      authorUser: { select: { id: true, fullName: true } },
    },
  },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  private toDate(v?: string): Date | undefined {
    if (!v) return undefined;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Format tanggal tidak valid');
    }
    return d;
  }

  // ==================== PROJECTS ====================

  async listProjects(
    tenantId: string,
    params?: { status?: string; q?: string; page?: number; limit?: number },
  ) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;
    const where: any = { tenantId, deletedAt: null };
    if (params?.status) where.status = params.status;
    if (params?.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { code: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: PROJECT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async getProject(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        ...PROJECT_INCLUDE,
        tasks: {
          where: { deletedAt: null, parentTaskId: null },
          include: { assignee: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    return project;
  }

  async createProject(tenantId: string, dto: CreateProjectDto) {
    const dup = await this.prisma.project.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (dup) throw new BadRequestException(`Kode project "${dto.code}" sudah dipakai`);
    return this.prisma.project.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        status: (dto.status as any) ?? 'PLANNING',
        priority: (dto.priority as any) ?? 'MEDIUM',
        ownerUserId: dto.ownerUserId,
        departmentId: dto.departmentId,
        startDate: this.toDate(dto.startDate),
        endDate: this.toDate(dto.endDate),
        color: dto.color,
      },
      include: PROJECT_INCLUDE,
    });
  }

  async updateProject(tenantId: string, id: string, dto: UpdateProjectDto) {
    await this.ensureProject(tenantId, id);
    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status as any,
        priority: dto.priority as any,
        departmentId: dto.departmentId,
        startDate: this.toDate(dto.startDate),
        endDate: this.toDate(dto.endDate),
        color: dto.color,
      },
      include: PROJECT_INCLUDE,
    });
  }

  async deleteProject(tenantId: string, id: string) {
    await this.ensureProject(tenantId, id);
    return this.prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addMember(tenantId: string, projectId: string, dto: AddProjectMemberDto) {
    await this.ensureProject(tenantId, projectId);
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
      select: { id: true },
    });
    if (!employee) throw new BadRequestException('Karyawan tidak ditemukan di tenant ini');
    return this.prisma.projectMember.upsert({
      where: { projectId_employeeId: { projectId, employeeId: dto.employeeId } },
      create: {
        tenantId,
        projectId,
        employeeId: dto.employeeId,
        role: (dto.role as any) ?? 'MEMBER',
      },
      update: { role: (dto.role as any) ?? 'MEMBER' },
      include: { employee: { select: { id: true, fullName: true } } },
    });
  }


  // ==================== TASKS ====================

  async listTasks(
    tenantId: string,
    params?: {
      projectId?: string;
      assigneeEmployeeId?: string;
      status?: string;
      q?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 25;
    const where: any = { tenantId, deletedAt: null };
    if (params?.projectId) where.projectId = params.projectId;
    if (params?.assigneeEmployeeId) where.assigneeEmployeeId = params.assigneeEmployeeId;
    if (params?.status) where.status = params.status;
    if (params?.q) where.title = { contains: params.q, mode: 'insensitive' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async getTask(tenantId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException('Task tidak ditemukan');
    return task;
  }

  async createTask(tenantId: string, reporterUserId: string, dto: CreateTaskDto) {
    if (dto.projectId) {
      const proj = await this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId, deletedAt: null },
      });
      if (!proj) throw new BadRequestException('Project tidak ditemukan');
    }
    await this.ensureAssignee(tenantId, dto.assigneeEmployeeId);
    await this.ensureParent(tenantId, dto.parentTaskId);
    const task = await this.prisma.task.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        status: (dto.status as any) ?? 'TODO',
        priority: (dto.priority as any) ?? 'MEDIUM',
        assigneeEmployeeId: dto.assigneeEmployeeId,
        reporterUserId,
        dueDate: this.toDate(dto.dueDate),
        estimateHours: dto.estimateHours,
        tags: dto.tags ?? [],
        parentTaskId: dto.parentTaskId,
        completedAt: dto.status === 'DONE' ? new Date() : undefined,
      },
      include: TASK_INCLUDE,
    });

    // TM-06: beritahu assignee saat task baru ditugaskan.
    if (dto.assigneeEmployeeId) {
      await this.notifyEmployee(
        tenantId,
        dto.assigneeEmployeeId,
        'task.assigned',
        'Task baru ditugaskan',
        `Anda ditugaskan pada task: ${dto.title}`,
        { taskId: task.id, title: dto.title },
      );
    }
    return task;
  }

  async updateTask(tenantId: string, id: string, dto: UpdateTaskDto) {
    const current = await this.ensureTask(tenantId, id);
    await this.ensureAssignee(tenantId, dto.assigneeEmployeeId);
    if (dto.parentTaskId) {
      if (dto.parentTaskId === id) throw new BadRequestException('Task tidak bisa menjadi induk dirinya sendiri');
      await this.ensureParent(tenantId, dto.parentTaskId);
    }

    // TM-04/06: task dengan dependency yang belum DONE tidak boleh di-DONE-kan.
    if (dto.status === 'DONE' && current.status !== 'DONE') {
      const blockers = await this.prisma.taskDependency.findMany({
        where: { tenantId, taskId: id },
        include: { dependsOn: { select: { id: true, title: true, status: true } } },
      });
      const unfinished = blockers.filter((b: any) => b.dependsOn?.status !== 'DONE');
      if (unfinished.length > 0) {
        const titles = unfinished.map((b: any) => `"${b.dependsOn?.title}"`).join(', ');
        throw new BadRequestException(
          `Task masih diblokir oleh dependency yang belum selesai: ${titles}`,
        );
      }
    }

    const data: any = {
      title: dto.title,
      description: dto.description,
      projectId: dto.projectId,
      status: dto.status,
      priority: dto.priority,
      assigneeEmployeeId: dto.assigneeEmployeeId,
      dueDate: this.toDate(dto.dueDate),
      estimateHours: dto.estimateHours,
      tags: dto.tags,
      parentTaskId: dto.parentTaskId,
    };
    if (dto.status === 'DONE') data.completedAt = new Date();
    else if (dto.status) data.completedAt = null;
    const task = await this.prisma.task.update({ where: { id }, data, include: TASK_INCLUDE });

    // TM-06: notifikasi assignee baru & pelapor saat task selesai.
    if (dto.assigneeEmployeeId && dto.assigneeEmployeeId !== current.assigneeEmployeeId) {
      await this.notifyEmployee(
        tenantId,
        dto.assigneeEmployeeId,
        'task.assigned',
        'Task ditugaskan kepada Anda',
        `Anda ditugaskan pada task: ${task.title}`,
        { taskId: task.id, title: task.title },
      );
    }
    if (current.status !== 'DONE' && task.status === 'DONE' && current.reporterUserId) {
      await this.notifyUser(
        tenantId,
        current.reporterUserId,
        'task.completed',
        'Task selesai',
        `Task "${task.title}" telah diselesaikan`,
        { taskId: task.id, title: task.title },
      );
    }
    return task;
  }

  /** Time tracking sederhana: akumulasi jam aktual ke `loggedHours`. */
  async logHours(tenantId: string, id: string, hours: number) {
    await this.ensureTask(tenantId, id);
    if (!Number.isFinite(hours) || hours <= 0) {
      throw new BadRequestException('Jam kerja harus lebih dari 0');
    }
    return this.prisma.task.update({
      where: { id },
      data: { loggedHours: { increment: hours } },
      include: TASK_INCLUDE,
    });
  }

  async deleteTask(tenantId: string, id: string) {
    await this.ensureTask(tenantId, id);
    return this.prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addComment(
    tenantId: string,
    taskId: string,
    actor: { employeeId?: string | null; userId: string },
    dto: AddTaskCommentDto,
  ) {
    await this.ensureTask(tenantId, taskId);
    const content = dto.content?.trim();
    if (!content) throw new BadRequestException('Isi komentar wajib diisi');
    return this.prisma.taskComment.create({
      data: {
        tenantId,
        taskId,
        authorEmployeeId: actor.employeeId ?? null,
        authorUserId: actor.userId,
        content,
      },
      include: {
        authorEmployee: { select: { id: true, fullName: true } },
        authorUser: { select: { id: true, fullName: true } },
      },
    });
  }

  /** "My Tasks": task yang di-assign ke employee pemanggil, dikelompokkan untuk tampilan personal. */
  async myTasks(tenantId: string, employeeId: string | null | undefined) {
    if (!employeeId) return { items: [], total: 0, overdue: 0, dueToday: 0 };
    const where: any = { tenantId, deletedAt: null, assigneeEmployeeId: employeeId };
    const items = await this.prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const open = items.filter((t: any) => t.status !== 'DONE');
    return {
      items,
      total: items.length,
      overdue: open.filter((t: any) => t.dueDate && new Date(t.dueDate) < startOfDay).length,
      dueToday: open.filter(
        (t: any) => t.dueDate && new Date(t.dueDate) >= startOfDay && new Date(t.dueDate) < endOfDay,
      ).length,
    };
  }

  async stats(tenantId: string) {
    const [byStatus, total, overdue] = await this.prisma.$transaction([
      this.prisma.task.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.task.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.task.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { notIn: ['DONE'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);
    const statusMap: Record<string, number> = {};
    for (const row of byStatus) {
      const count = (row._count as { _all?: number } | undefined)?._all ?? 0;
      statusMap[row.status] = count;
    }
    return { total, overdue, byStatus: statusMap };
  }

  private async ensureProject(tenantId: string, id: string) {
    const p = await this.prisma.project.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!p) throw new NotFoundException('Project tidak ditemukan');
    return p;
  }

  private async ensureTask(tenantId: string, id: string) {
    const t = await this.prisma.task.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!t) throw new NotFoundException('Task tidak ditemukan');
    return t;
  }

  private async ensureAssignee(tenantId: string, employeeId?: string) {
    if (!employeeId) return;
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { id: true },
    });
    if (!emp) throw new BadRequestException('Karyawan (assignee) tidak ditemukan di tenant ini');
  }

  private async ensureParent(tenantId: string, parentTaskId?: string) {
    if (!parentTaskId) return;
    const parent = await this.prisma.task.findFirst({
      where: { id: parentTaskId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!parent) throw new BadRequestException('Task induk tidak ditemukan');
  }

  // ==================== TM-04: GANTT BOARD ====================

  /**
   * Data Gantt chart: seluruh task (per project opsional) beserta edge dependency
   * antar task yang sama, dalam satu respons (hindari N+1 request per task).
   * Catatan: model Task tidak punya startDate — posisi bar diturunkan di FE dari
   * dueDate + estimateHours (fallback completedAt/createdAt).
   */
  async ganttBoard(tenantId: string, projectId?: string) {
    const where: any = { tenantId, deletedAt: null };
    if (projectId) where.projectId = projectId;
    const tasks = await this.prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      take: 300,
    });
    const ids = tasks.map((t: any) => t.id);
    const dependencies = ids.length
      ? await this.prisma.taskDependency.findMany({
          where: { tenantId, taskId: { in: ids }, dependsOnTaskId: { in: ids } },
          select: { id: true, taskId: true, dependsOnTaskId: true, type: true },
        })
      : [];
    return { tasks, dependencies };
  }

  // ==================== DEPENDENCY API (TM-04 Gantt / TM-06) ====================

  /** Detail dependency suatu task: blockers (yang memblokir) + blocking (yang diblokir). */
  async listDependencies(tenantId: string, taskId: string) {
    await this.ensureTask(tenantId, taskId);
    const [blockedBy, blocking] = await Promise.all([
      this.prisma.taskDependency.findMany({
        where: { tenantId, taskId },
        include: { dependsOn: { select: { id: true, title: true, status: true, dueDate: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.taskDependency.findMany({
        where: { tenantId, dependsOnTaskId: taskId },
        include: { task: { select: { id: true, title: true, status: true, dueDate: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { blockedBy, blocking };
  }

  /** Tambah dependency: task ini diblokir oleh `dependsOnTaskId` sampai selesai. */
  async addDependency(tenantId: string, taskId: string, dto: { dependsOnTaskId: string; type?: string }) {
    await this.ensureTask(tenantId, taskId);
    await this.ensureTask(tenantId, dto.dependsOnTaskId);
    if (taskId === dto.dependsOnTaskId) {
      throw new BadRequestException('Task tidak bisa diblokir oleh dirinya sendiri');
    }
    const dup = await this.prisma.taskDependency.findUnique({
      where: {
        tenantId_taskId_dependsOnTaskId: { tenantId, taskId, dependsOnTaskId: dto.dependsOnTaskId },
      },
    });
    if (dup) throw new BadRequestException('Dependency tersebut sudah ada');

    // Cegah siklus langsung (A→B bila B sudah bergantung pada A).
    const reverse = await this.prisma.taskDependency.findUnique({
      where: {
        tenantId_taskId_dependsOnTaskId: {
          tenantId,
          taskId: dto.dependsOnTaskId,
          dependsOnTaskId: taskId,
        },
      },
    });
    if (reverse) throw new BadRequestException('Dependency akan membentuk siklus');

    return this.prisma.taskDependency.create({
      data: {
        tenantId,
        taskId,
        dependsOnTaskId: dto.dependsOnTaskId,
        type: (dto.type as any) ?? 'FINISH_TO_START',
      },
      include: { dependsOn: { select: { id: true, title: true, status: true } } },
    });
  }

  /** Hapus dependency (id = id record TaskDependency). */
  async removeDependency(tenantId: string, dependencyId: string) {
    const dep = await this.prisma.taskDependency.findFirst({
      where: { id: dependencyId, tenantId },
    });
    if (!dep) throw new NotFoundException('Dependency tidak ditemukan');
    return this.prisma.taskDependency.delete({ where: { id: dependencyId } });
  }

  // ==================== TM-07: TASK COMPLETION → PERFORMANCE ====================

  /**
   * Completion rate tugas karyawan pada rentang tanggal (default 90 hari terakhir).
   * Dipakai performance review sebagai data objective (feed TM-07).
   */
  async completionRate(
    tenantId: string,
    employeeId: string,
    from?: string,
    to?: string,
  ) {
    const endDate = this.toDate(to) ?? new Date();
    const startDate = this.toDate(from) ?? new Date(endDate.getTime() - 90 * 86400000);

    const base: any = {
      tenantId,
      deletedAt: null,
      assigneeEmployeeId: employeeId,
      OR: [
        { dueDate: { gte: startDate, lte: endDate } },
        { dueDate: null, createdAt: { gte: startDate, lte: endDate } },
      ],
    };
    const [total, done, overdue, doneTasks] = await Promise.all([
      this.prisma.task.count({ where: base }),
      this.prisma.task.count({ where: { ...base, status: 'DONE' } }),
      this.prisma.task.count({
        where: { ...base, status: { not: 'DONE' }, dueDate: { lt: new Date() } },
      }),
      this.prisma.task.findMany({
        where: { ...base, status: 'DONE', completedAt: { not: null } },
        select: { dueDate: true, completedAt: true },
      }),
    ]);
    const onTime = doneTasks.filter(
      (t: any) => t.dueDate && t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate),
    ).length;

    return {
      employeeId,
      from: startDate,
      to: endDate,
      total,
      done,
      overdue,
      onTime,
      completionRate: total === 0 ? 0 : Math.round((done / total) * 100) / 100,
      onTimeRate: done === 0 ? 0 : Math.round((onTime / done) * 100) / 100,
    };
  }

  // ==================== TM-06: REMINDER H-1 & OVERDUE ====================

  /**
   * Pengingat due date: H-1 (jatuh tempo besok) dan overdue.
   * Dedup via notifikasi in-app hari yang sama (payload.taskId + templateKey),
   * sehingga aman dipanggil cron berulang tiap hari.
   */
  async sendDueReminders(tenantId: string): Promise<{ sent: number }> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const endOfTomorrow = new Date(startOfTomorrow);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

    const openTasks = (await this.prisma.task.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { not: 'DONE' },
        assigneeEmployeeId: { not: null },
        dueDate: { not: null, lt: endOfTomorrow },
      },
      select: { id: true, title: true, dueDate: true, assigneeEmployeeId: true },
      take: 500,
    })) as any[];

    let sent = 0;
    for (const t of openTasks) {
      const due: Date = new Date(t.dueDate);
      const isOverdue = due < startOfToday;
      const isDueTomorrow = due >= startOfTomorrow && due < endOfTomorrow;
      if (!isOverdue && !isDueTomorrow) continue;

      const templateKey = isOverdue ? 'task.overdue' : 'task.due_soon';
      const taskDate = due.toISOString().slice(0, 10);

      const existing = await this.prisma.notification.findFirst({
        where: {
          tenantId,
          templateKey,
          createdAt: { gte: startOfToday },
          payload: { path: ['taskId'], equals: t.id },
        },
        select: { id: true },
      });
      if (existing) continue;

      await this.notifyEmployee(
        tenantId,
        t.assigneeEmployeeId,
        templateKey,
        isOverdue ? 'Task terlambat' : 'Pengingat tenggat task',
        isOverdue
          ? `Task "${t.title}" lewat tenggat (${taskDate})`
          : `Task "${t.title}" jatuh tempo besok (${taskDate})`,
        { taskId: t.id, title: t.title, taskDate },
      );
      sent += 1;
    }
    return { sent };
  }

  // ==================== HELPER NOTIFIKASI (TM-06) ====================

  /** In-app notification ke employee (resolve userId bila ada); gagal = log, bukan error. */
  private async notifyEmployee(
    tenantId: string,
    employeeId: string | null | undefined,
    templateKey: string,
    title: string,
    body: string,
    payload?: Record<string, any>,
  ): Promise<void> {
    if (!employeeId) return;
    try {
      const user = await this.prisma.user.findFirst({
        where: { employeeId, tenantId, deletedAt: null },
        select: { id: true },
      });
      await this.notifications.send({
        tenantId,
        userId: user?.id,
        employeeId,
        channel: 'IN_APP',
        templateKey,
        title,
        body,
        payload,
      });
    } catch {
      // notifikasi tidak boleh menggagalkan operasi utama
    }
  }

  /** In-app notification ke user (pelapor). */
  private async notifyUser(
    tenantId: string,
    userId: string,
    templateKey: string,
    title: string,
    body: string,
    payload?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.notifications.send({
        tenantId,
        userId,
        channel: 'IN_APP',
        templateKey,
        title,
        body,
        payload,
      });
    } catch {
      // best-effort
    }
  }
}
