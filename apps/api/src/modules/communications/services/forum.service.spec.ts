import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@common/prisma/prisma.service';
import { ForumService } from './forum.service';

function buildPrismaMock() {
  return {
    forumThread: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    forumComment: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    forumReaction: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
    forumMention: { createMany: jest.fn(), findFirst: jest.fn() },
    forumReport: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    employee: { findMany: jest.fn() },
    department: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
}

type PrismaMock = ReturnType<typeof buildPrismaMock>;

describe('ForumService', () => {
  let service: ForumService;
  let prisma: PrismaMock;

  const TENANT = 'tenant-1';
  const USER = 'user-1';
  const ADMIN = { userId: 'admin-1', employeeId: null, isAdmin: true };
  const EMP = { userId: USER, employeeId: 'emp-1', isAdmin: false };

  beforeEach(async () => {
    prisma = buildPrismaMock();
    prisma.$transaction.mockImplementation(async (ops: any) => Promise.all(ops));
    prisma.employee.findMany.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [ForumService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ForumService);
  });

  afterEach(() => jest.clearAllMocks());

  it('employee bisa membuat DISCUSSION', async () => {
    prisma.forumThread.create.mockResolvedValue({ id: 'th-1' });
    const res = await service.createThread(TENANT, EMP, { content: 'Halo semua' });
    expect(res).toEqual({ id: 'th-1' });
    expect(prisma.forumThread.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: TENANT, authorUserId: USER, content: 'Halo semua' }),
    }));
  });

  it('employee DITOLAK membuat ANNOUNCEMENT (admin-only)', async () => {
    await expect(service.createThread(TENANT, EMP, { type: 'ANNOUNCEMENT', content: 'x' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('admin bisa membuat ANNOUNCEMENT', async () => {
    prisma.forumThread.create.mockResolvedValue({ id: 'th-2' });
    const res = await service.createThread(TENANT, ADMIN, { type: 'ANNOUNCEMENT', title: 'Info', content: 'Libur' });
    expect(res).toEqual({ id: 'th-2' });
  });

  it('POLL tanpa 2 opsi DITOLAK', async () => {
    await expect(service.createThread(TENANT, EMP, { type: 'POLL', content: 'Pilih?', pollOptions: ['satu'] }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('EVENT tanpa eventDate DITOLAK', async () => {
    await expect(service.createThread(TENANT, EMP, { type: 'EVENT', content: 'Acara' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('bukan penulis dan bukan admin DITOLAK update/delete', async () => {
    prisma.forumThread.findFirst.mockResolvedValue({ id: 'th-1', authorUserId: 'other' });
    await expect(service.updateThread(TENANT, EMP, 'th-1', { content: 'x' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteThread(TENANT, EMP, 'th-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('pin oleh non-admin DITOLAK', async () => {
    prisma.forumThread.findFirst.mockResolvedValue({ id: 'th-1', authorUserId: USER });
    await expect(service.updateThread(TENANT, EMP, 'th-1', { isPinned: true }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('thread terkunci menolak komentar', async () => {
    prisma.forumThread.findFirst.mockResolvedValue({ id: 'th-1', isLocked: true });
    await expect(service.addComment(TENANT, EMP, 'th-1', { content: 'halo' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
  it('nested reply lebih dari 3 level DITOLAK', async () => {
    prisma.forumThread.findFirst.mockResolvedValue({ id: 'th-1', isLocked: false });
    prisma.forumComment.findFirst
      .mockResolvedValueOnce({ id: 'c3', parentCommentId: 'c2' })
      .mockResolvedValueOnce({ id: 'c2', parentCommentId: 'c1' })
      .mockResolvedValueOnce({ id: 'c1', parentCommentId: null });
    await expect(service.addComment(TENANT, EMP, 'th-1', { content: 'x', parentCommentId: 'c3' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('reaction kedua = toggle off', async () => {
    prisma.forumThread.findFirst.mockResolvedValue({ id: 'th-1' });
    prisma.forumReaction.findFirst.mockResolvedValue({ id: 'r-1' });
    const res = await service.toggleReaction(TENANT, EMP, { threadId: 'th-1' });
    expect(res).toEqual({ reacted: false, reactionType: 'LIKE' });
    expect(prisma.forumReaction.delete).toHaveBeenCalledWith({ where: { id: 'r-1' } });
  });

  it('thread + comment sekaligus DITOLAK', async () => {
    await expect(service.toggleReaction(TENANT, EMP, { threadId: 't', commentId: 'c' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('bukan thread POLL DITOLAK vote', async () => {
    prisma.forumThread.findFirst.mockResolvedValue({ id: 't', type: 'DISCUSSION', pollOptions: [], isLocked: false });
    await expect(service.votePoll(TENANT, 't', 0)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('optionIndex di luar rentang DITOLAK', async () => {
    prisma.forumThread.findFirst.mockResolvedValue({
      id: 't', type: 'POLL', isLocked: false, pollOptions: [{ text: 'A', votes: 0 }],
    });
    await expect(service.votePoll(TENANT, 't', 5)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('vote valid menambah votes opsi', async () => {
    prisma.forumThread.findFirst.mockResolvedValue({
      id: 't', type: 'POLL', isLocked: false, pollOptions: [{ text: 'A', votes: 2 }, { text: 'B', votes: 1 }],
    });
    prisma.forumThread.update.mockResolvedValue({ id: 't' });
    await service.votePoll(TENANT, 't', 1);
    expect(prisma.forumThread.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ pollOptions: [{ text: 'A', votes: 2 }, { text: 'B', votes: 2 }] }),
    }));
  });

  it('pinned selalu di atas (orderBy isPinned desc)', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);
    await service.listThreads(TENANT, { page: 1, limit: 5 });
    expect(prisma.forumThread.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    }));
  });

  it('thread tidak ada -> NotFound', async () => {
    prisma.forumThread.findFirst.mockResolvedValue(null);
    await expect(service.getThread(TENANT, 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
