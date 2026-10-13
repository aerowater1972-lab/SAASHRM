import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { TasksService } from './tasks.service';

/**
 * Mock Prisma untuk unit test TasksService.
 * Hanya method yang dipakai service yang di-mock.
 */
function buildPrismaMock() {
  return {
    project: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    projectMember: { upsert: jest.fn() },
    task: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    taskComment: { create: jest.fn() },
    taskDependency: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    notification: { findFirst: jest.fn().mockResolvedValue(null) },
    user: { findFirst: jest.fn().mockResolvedValue(null) },
    employee: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
}

type PrismaMock = ReturnType<typeof buildPrismaMock>;

describe('TasksService', () => {
  let service: TasksService;
  let prisma: PrismaMock;
  const notifications = { send: jest.fn().mockResolvedValue(undefined) };

  const TENANT = 'tenant-1';
  const PROJECT = 'proj-1';
  const TASK = 'task-1';
  const USER = 'user-1';
  const EMPLOYEE = 'emp-1';

  beforeEach(async () => {
    prisma = buildPrismaMock();
    // $transaction([a, b]) -> kembalikan array hasil kedua promise
    prisma.$transaction.mockImplementation(async (ops: any) => Promise.all(ops));
    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compile();
    service = moduleRef.get(TasksService);
  });

  afterEach(() => jest.clearAllMocks());

  // â”€â”€ listProjects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('listProjects', () => {
    it('mengembalikan halaman default (limit 20) dan menghitung totalPages', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: PROJECT }], 21]);
      const res = await service.listProjects(TENANT);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
      expect(res.totalPages).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('membatasi limit maksimal 100', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      const res = await service.listProjects(TENANT, { limit: 500 });
      expect(res.limit).toBe(100);
    });
  });

  // â”€â”€ createProject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('createProject', () => {
    it('membuat project dengan default status PLANNING & priority MEDIUM', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue({ id: PROJECT, code: 'PRJ-1' });

      const res = await service.createProject(TENANT, {
        name: 'Project A',
        code: 'PRJ-1',
        ownerUserId: USER,
      } as any);

      expect(res.id).toBe(PROJECT);
      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT,
            status: 'PLANNING',
            priority: 'MEDIUM',
            code: 'PRJ-1',
          }),
        }),
      );
    });

    it('menolak kode project duplikat', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'lain' });
      await expect(
        service.createProject(TENANT, { name: 'x', code: 'PRJ-1', ownerUserId: USER } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.project.create).not.toHaveBeenCalled();
    });
  });

  // â”€â”€ getProject / deleteProject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('getProject', () => {
    it('melempar NotFound bila project tidak ada di tenant', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      await expect(service.getProject(TENANT, PROJECT)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteProject', () => {
    it('soft delete dengan mengisi deletedAt', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: PROJECT });
      prisma.project.update.mockResolvedValue({ id: PROJECT, deletedAt: new Date() });
      await service.deleteProject(TENANT, PROJECT);
      expect(prisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { deletedAt: expect.any(Date) } }),
      );
    });
  });

  // â”€â”€ addMember â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('addMember', () => {
    it('menolak bila karyawan bukan milik tenant', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: PROJECT });
      prisma.employee.findFirst.mockResolvedValue(null);
      await expect(
        service.addMember(TENANT, PROJECT, { employeeId: EMPLOYEE } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.projectMember.upsert).not.toHaveBeenCalled();
    });

    it('menambahkan anggota dengan role default MEMBER', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: PROJECT });
      prisma.employee.findFirst.mockResolvedValue({ id: EMPLOYEE });
      prisma.projectMember.upsert.mockResolvedValue({ id: 'pm-1', role: 'MEMBER' });

      await service.addMember(TENANT, PROJECT, { employeeId: EMPLOYEE } as any);
      expect(prisma.projectMember.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId_employeeId: { projectId: PROJECT, employeeId: EMPLOYEE } },
        }),
      );
    });
  });

  // â”€â”€ createTask â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('createTask', () => {
    it('membuat task dengan default status TODO', async () => {
      prisma.employee.findFirst.mockResolvedValue({ id: EMPLOYEE });
      prisma.task.create.mockResolvedValue({ id: TASK, status: 'TODO' });

      await service.createTask(TENANT, USER, {
        title: 'Buat laporan',
        assigneeEmployeeId: EMPLOYEE,
      } as any);

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT,
            title: 'Buat laporan',
            status: 'TODO',
            priority: 'MEDIUM',
            reporterUserId: USER,
            tags: [],
          }),
        }),
      );
    });

    it('menolak bila project tidak ditemukan', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      await expect(
        service.createTask(TENANT, USER, { title: 'x', projectId: PROJECT } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.task.create).not.toHaveBeenCalled();
    });

    it('menolak assignee di luar tenant', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      await expect(
        service.createTask(TENANT, USER, { title: 'x', assigneeEmployeeId: 'asing' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.task.create).not.toHaveBeenCalled();
    });
  });

  // ── updateTask ─────────────────────────────────────────────────

  describe('updateTask', () => {
    it('mengisi completedAt saat status menjadi DONE', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: TASK });
      prisma.task.update.mockResolvedValue({ id: TASK, status: 'DONE' });

      await service.updateTask(TENANT, TASK, { status: 'DONE' } as any);
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completedAt: expect.any(Date) }) }),
      );
    });

    it('mengosongkan completedAt saat status keluar dari DONE', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: TASK });
      prisma.task.update.mockResolvedValue({ id: TASK, status: 'IN_PROGRESS' });

      await service.updateTask(TENANT, TASK, { status: 'IN_PROGRESS' } as any);
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completedAt: null }) }),
      );
    });

    it('menolak task menjadi induk dirinya sendiri', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: TASK });
      await expect(service.updateTask(TENANT, TASK, { parentTaskId: TASK } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('melempar NotFound bila task tidak ada', async () => {
      prisma.task.findFirst.mockResolvedValue(null);
      await expect(service.updateTask(TENANT, TASK, { title: 'x' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ── logHours ───────────────────────────────────────────────────

  describe('logHours', () => {
    it('menambahkan jam ke loggedHours', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: TASK });
      prisma.task.update.mockResolvedValue({ id: TASK, loggedHours: 3 });

      await service.logHours(TENANT, TASK, 1.5);
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { loggedHours: { increment: 1.5 } } }),
      );
    });

    it('menolak jam <= 0', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: TASK });
      await expect(service.logHours(TENANT, TASK, 0)).rejects.toThrow(BadRequestException);
      expect(prisma.task.update).not.toHaveBeenCalled();
    });
  });

  // --- addComment -------------------------------------------------

  describe('addComment', () => {
    it('menolak komentar kosong', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: TASK });
      await expect(
        service.addComment(TENANT, TASK, { userId: USER, employeeId: EMPLOYEE }, { content: '   ' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.taskComment.create).not.toHaveBeenCalled();
    });

    it('menyimpan komentar yang sudah di-trim', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: TASK });
      prisma.taskComment.create.mockResolvedValue({ id: 'c-1', content: 'Halo' });

      await service.addComment(TENANT, TASK, { userId: USER, employeeId: null }, { content: '  Halo  ' } as any);
      expect(prisma.taskComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: 'Halo', authorUserId: USER, authorEmployeeId: null }),
        }),
      );
    });
  });

  // --- stats ------------------------------------------------------

  describe('stats', () => {
    it('mengembalikan total, overdue, dan rincian per status', async () => {
      prisma.$transaction.mockResolvedValue([
        [
          { status: 'TODO', _count: { _all: 4 } },
          { status: 'DONE', _count: { _all: 6 } },
        ],
        10,
        2,
      ]);

      const res = await service.stats(TENANT);
      expect(res.total).toBe(10);
      expect(res.overdue).toBe(2);
      expect(res.byStatus).toEqual({ TODO: 4, DONE: 6 });
    });
  });

  // --- myTasks ----------------------------------------------------

  describe('myTasks', () => {
    it('mengembalikan ringkasan kosong bila user tidak punya employeeId', async () => {
      const res = await service.myTasks(TENANT, null);
      expect(res).toEqual({ items: [], total: 0, overdue: 0, dueToday: 0 });
      expect(prisma.task.findMany).not.toHaveBeenCalled();
    });

    it('menghitung overdue berdasarkan dueDate sebelum hari ini', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 3);

      prisma.task.findMany.mockResolvedValue([
        { id: 't-overdue', status: 'TODO', dueDate: past },
        { id: 't-done', status: 'DONE', dueDate: past },
      ]);

      const res = await service.myTasks(TENANT, EMPLOYEE);
      expect(res.total).toBe(2);
      expect(res.overdue).toBe(1);
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT, assigneeEmployeeId: EMPLOYEE }),
        }),
      );
    });
  });

  // --- TM-06: notifikasi ---

  describe('TM-06 notifikasi', () => {
    it('createTask memberi tahu assignee', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      prisma.employee.findFirst.mockResolvedValue({ id: EMPLOYEE });
      prisma.task.create.mockResolvedValue({ id: TASK, title: 'T1' });
      prisma.user.findFirst.mockResolvedValue({ id: USER });

      await service.createTask(TENANT, USER, {
        title: 'T1',
        assigneeEmployeeId: EMPLOYEE,
      } as any);

      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT,
          employeeId: EMPLOYEE,
          userId: USER,
          templateKey: 'task.assigned',
        }),
      );
    });

    it('updateTask DONE memberi tahu pelapor', async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: TASK, tenantId: TENANT, status: 'IN_PROGRESS',
        assigneeEmployeeId: EMPLOYEE, reporterUserId: USER, title: 'T1',
      });
      prisma.task.update.mockResolvedValue({ id: TASK, title: 'T1', status: 'DONE' });

      await service.updateTask(TENANT, TASK, { status: 'DONE' } as any);

      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ templateKey: 'task.completed', userId: USER }),
      );
    });

    it('sendDueReminders: kirim overdue, lewati yang sudah dinotifikasi hari ini', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      prisma.task.findMany.mockResolvedValue([
        { id: 't1', title: 'Due besok', dueDate: tomorrow, assigneeEmployeeId: EMPLOYEE },
        { id: 't2', title: 'Telat', dueDate: yesterday, assigneeEmployeeId: EMPLOYEE },
      ]);
      prisma.notification.findFirst
        .mockResolvedValueOnce({ id: 'n-existing' })
        .mockResolvedValueOnce(null);

      const res = await service.sendDueReminders(TENANT);
      expect(res.sent).toBe(1);
      expect(notifications.send).toHaveBeenCalledTimes(1);
      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ templateKey: 'task.overdue', employeeId: EMPLOYEE }),
      );
    });
  });

  // --- TM-07: completion rate ---

  describe('TM-07 completionRate', () => {
    it('menghitung rate, on-time, dan overdue', async () => {
      const doneAt = new Date('2026-10-01T10:00:00Z');
      prisma.task.count
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(1);
      prisma.task.findMany.mockResolvedValue([
        { dueDate: new Date('2026-10-02T00:00:00Z'), completedAt: doneAt },
        { dueDate: new Date('2026-10-01T00:00:00Z'), completedAt: doneAt },
        { dueDate: null, completedAt: doneAt },
      ]);

      const res = await service.completionRate(TENANT, EMPLOYEE, '2026-07-01', '2026-10-31');
      expect(res.total).toBe(8);
      expect(res.done).toBe(6);
      expect(res.overdue).toBe(1);
      expect(res.completionRate).toBe(0.75);
      expect(res.onTime).toBe(1);
      expect(res.onTimeRate).toBe(0.17);
    });

    it('tanpa tugas -> rate 0 tanpa error', async () => {
      prisma.task.count.mockResolvedValue(0);
      prisma.task.findMany.mockResolvedValue([]);
      const res = await service.completionRate(TENANT, EMPLOYEE);
      expect(res.completionRate).toBe(0);
      expect(res.onTimeRate).toBe(0);
    });
  });

  // --- Dependency API (TM-04/06) ---

  describe('dependency API', () => {
    it('menolak dependency diri sendiri', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: TASK });
      await expect(
        service.addDependency(TENANT, TASK, { dependsOnTaskId: TASK }),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak dependency duplikat', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: TASK });
      prisma.taskDependency.findUnique
        .mockResolvedValueOnce({ id: 'd-existing' });
      await expect(
        service.addDependency(TENANT, TASK, { dependsOnTaskId: 'task-2' }),
      ).rejects.toThrow('sudah ada');
    });

    it('memblokir DONE bila ada dependency yang belum selesai', async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: TASK, tenantId: TENANT, status: 'IN_PROGRESS', reporterUserId: USER, title: 'T1',
      });
      prisma.taskDependency.findMany.mockResolvedValue([
        { dependsOn: { id: 'b1', title: 'Blocker', status: 'TODO' } },
      ]);

      await expect(service.updateTask(TENANT, TASK, { status: 'DONE' } as any))
        .rejects.toThrow('diblokir');
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('mengizinkan DONE setelah semua dependency selesai', async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: TASK, tenantId: TENANT, status: 'IN_PROGRESS', reporterUserId: USER, title: 'T1',
      });
      prisma.taskDependency.findMany.mockResolvedValue([
        { dependsOn: { id: 'b1', title: 'Blocker', status: 'DONE' } },
      ]);
      prisma.task.update.mockResolvedValue({ id: TASK, status: 'DONE', title: 'T1' });

      const res = await service.updateTask(TENANT, TASK, { status: 'DONE' } as any);
      expect(res.status).toBe('DONE');
    });
  });
});