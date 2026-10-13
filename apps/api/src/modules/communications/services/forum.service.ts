import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AddForumCommentDto, CreateForumThreadDto, ReportForumContentDto, ReviewForumReportDto, UpdateForumThreadDto } from '../dto/forum.dto';

const THREAD_INCLUDE = {
  author: { select: { id: true, fullName: true, email: true } },
  department: { select: { id: true, name: true } },
  _count: { select: { comments: true, reactions: true } },
} as const;

const MAX_COMMENT_DEPTH = 3;

export interface ForumActor { userId: string; employeeId: string | null; isAdmin: boolean; }

@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaService) {}

  private toDate(v?: string): Date | undefined {
    if (!v) return undefined;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Format tanggal tidak valid');
    return d;
  }

  private async resolveMentions(tenantId: string, content: string): Promise<string[]> {
    const tokens = Array.from(new Set((content.match(/@([A-Za-z0-9_.]{2,40})/g) ?? []).map((m) => m.slice(1).toLowerCase()))).slice(0, 10);
    if (!tokens.length) return [];
    const employees = await this.prisma.employee.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, fullName: true }, take: 200 });
    const ids: string[] = [];
    for (const t of tokens) {
      const hit = employees.find((e) => e.fullName.toLowerCase().includes(t));
      if (hit && !ids.includes(hit.id)) ids.push(hit.id);
    }
    return ids;
  }

  async listThreads(tenantId: string, params?: { type?: string; departmentId?: string; q?: string; page?: number; limit?: number }) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 50) : 20;
    const where: any = { tenantId, deletedAt: null };
    if (params?.type) where.type = params.type;
    if (params?.departmentId) where.departmentId = params.departmentId;
    if (params?.q) where.OR = [{ title: { contains: params.q, mode: 'insensitive' } }, { content: { contains: params.q, mode: 'insensitive' } }];
    const [items, total] = await this.prisma.$transaction([
      this.prisma.forumThread.findMany({ where, include: THREAD_INCLUDE, orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.forumThread.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async getThread(tenantId: string, id: string) {
    const thread = await this.prisma.forumThread.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { ...THREAD_INCLUDE,
        comments: { where: { deletedAt: null, parentCommentId: null },
          include: { author: { select: { id: true, fullName: true } },
            replies: { where: { deletedAt: null }, include: { author: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'asc' } },
        reactions: { include: { user: { select: { id: true, fullName: true } } } } },
    });
    if (!thread) throw new NotFoundException('Thread forum tidak ditemukan');
    void this.prisma.forumThread.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);
    return thread;
  }

  async createThread(tenantId: string, actor: ForumActor, dto: CreateForumThreadDto) {
    const type = dto.type ?? 'DISCUSSION';
    if (type === 'ANNOUNCEMENT' && !actor.isAdmin) throw new ForbiddenException('Hanya admin yang boleh membuat thread ANNOUNCEMENT');
    if (type === 'POLL' && (!dto.pollOptions || dto.pollOptions.length < 2)) throw new BadRequestException('Polling membutuhkan minimal 2 opsi');
    if (type === 'EVENT' && !dto.eventDate) throw new BadRequestException('Thread EVENT membutuhkan eventDate');
    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({ where: { id: dto.departmentId, tenantId }, select: { id: true } });
      if (!dept) throw new BadRequestException('Department tidak ditemukan');
    }
    const pollOptions = type === 'POLL' ? (dto.pollOptions ?? []).map((text) => ({ text, votes: 0 })) : undefined;
    const thread = await this.prisma.forumThread.create({
      data: { tenantId, authorUserId: actor.userId, type: type as any, title: dto.title, content: dto.content,
        attachments: dto.attachments ?? [], visibility: (dto.visibility ?? 'PUBLIC') as any,
        departmentId: dto.departmentId, pollOptions: pollOptions as any,
        eventDate: this.toDate(dto.eventDate), eventLocation: dto.eventLocation },
      include: THREAD_INCLUDE,
    });
    const mentionIds = await this.resolveMentions(tenantId, `${dto.title ?? ''} ${dto.content}`);
    if (mentionIds.length) await this.prisma.forumMention.createMany({ data: mentionIds.map((employeeId) => ({ tenantId, threadId: thread.id, mentionedEmployeeId: employeeId })) });
    return thread;
  }
  async updateThread(tenantId: string, actor: ForumActor, id: string, dto: UpdateForumThreadDto) {
    const thread = await this.prisma.forumThread.findFirst({ where: { id, tenantId, deletedAt: null }, select: { id: true, authorUserId: true } });
    if (!thread) throw new NotFoundException('Thread forum tidak ditemukan');
    if (thread.authorUserId !== actor.userId && !actor.isAdmin) throw new ForbiddenException('Hanya penulis atau admin yang boleh mengubah thread');
    if ((dto.isPinned !== undefined || dto.isLocked !== undefined) && !actor.isAdmin) throw new ForbiddenException('Hanya admin yang boleh pin/lock thread');
    return this.prisma.forumThread.update({ where: { id },
      data: { ...(dto.title !== undefined ? { title: dto.title } : {}), ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.attachments !== undefined ? { attachments: dto.attachments } : {}), ...(dto.visibility !== undefined ? { visibility: dto.visibility as any } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.pollOptions !== undefined ? { pollOptions: dto.pollOptions.map((text) => ({ text, votes: 0 })) as any } : {}),
        ...(dto.eventDate !== undefined ? { eventDate: this.toDate(dto.eventDate) } : {}), ...(dto.eventLocation !== undefined ? { eventLocation: dto.eventLocation } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}), ...(dto.isLocked !== undefined ? { isLocked: dto.isLocked } : {}) },
      include: THREAD_INCLUDE });
  }

  async deleteThread(tenantId: string, actor: ForumActor, id: string) {
    const thread = await this.prisma.forumThread.findFirst({ where: { id, tenantId, deletedAt: null }, select: { id: true, authorUserId: true } });
    if (!thread) throw new NotFoundException('Thread forum tidak ditemukan');
    if (thread.authorUserId !== actor.userId && !actor.isAdmin) throw new ForbiddenException('Hanya penulis atau admin yang boleh menghapus thread');
    return this.prisma.forumThread.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async commentDepth(threadId: string, parentCommentId?: string): Promise<number> {
    let depth = 1; let currentId = parentCommentId; const seen = new Set<string>();
    while (currentId) {
      if (seen.has(currentId)) throw new BadRequestException('Rantai reply tidak valid');
      seen.add(currentId);
      const parent = await this.prisma.forumComment.findFirst({ where: { id: currentId, threadId, deletedAt: null }, select: { id: true, parentCommentId: true } });
      if (!parent) throw new BadRequestException('Komentar parent tidak ditemukan');
      depth += 1; if (depth > MAX_COMMENT_DEPTH) return depth;
      currentId = parent.parentCommentId ?? undefined;
    }
    return depth;
  }

  async addComment(tenantId: string, actor: ForumActor, threadId: string, dto: AddForumCommentDto) {
    const thread = await this.prisma.forumThread.findFirst({ where: { id: threadId, tenantId, deletedAt: null }, select: { id: true, isLocked: true } });
    if (!thread) throw new NotFoundException('Thread forum tidak ditemukan');
    if (thread.isLocked) throw new ForbiddenException('Thread dikunci, komentar ditutup');
    if (dto.parentCommentId) {
      const depth = await this.commentDepth(threadId, dto.parentCommentId);
      if (depth > MAX_COMMENT_DEPTH) throw new BadRequestException(`Nested reply maksimal ${MAX_COMMENT_DEPTH} level`);
    }
    const comment = await this.prisma.forumComment.create({
      data: { tenantId, threadId, parentCommentId: dto.parentCommentId, authorUserId: actor.userId, content: dto.content },
      include: { author: { select: { id: true, fullName: true } } } });
    const mentionIds = await this.resolveMentions(tenantId, dto.content);
    if (mentionIds.length) await this.prisma.forumMention.createMany({ data: mentionIds.map((employeeId) => ({ tenantId, threadId, commentId: comment.id, mentionedEmployeeId: employeeId })) });
    return comment;
  }

  async deleteComment(tenantId: string, actor: ForumActor, threadId: string, commentId: string) {
    const comment = await this.prisma.forumComment.findFirst({ where: { id: commentId, threadId, tenantId, deletedAt: null }, select: { id: true, authorUserId: true } });
    if (!comment) throw new NotFoundException('Komentar tidak ditemukan');
    if (comment.authorUserId !== actor.userId && !actor.isAdmin) throw new ForbiddenException('Hanya penulis atau admin yang boleh menghapus komentar');
    return this.prisma.forumComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  }
  async toggleReaction(tenantId: string, actor: ForumActor, params: { threadId?: string; commentId?: string; reactionType?: string }) {
    const reactionType = params.reactionType ?? 'LIKE';
    let targetType: 'THREAD' | 'COMMENT';
    if (params.threadId && !params.commentId) targetType = 'THREAD';
    else if (params.commentId && !params.threadId) targetType = 'COMMENT';
    else throw new BadRequestException('Isi threadId ATAU commentId (salah satu)');
    if (targetType === 'THREAD') {
      const t = await this.prisma.forumThread.findFirst({ where: { id: params.threadId!, tenantId, deletedAt: null }, select: { id: true } });
      if (!t) throw new NotFoundException('Thread forum tidak ditemukan');
    } else {
      const c = await this.prisma.forumComment.findFirst({ where: { id: params.commentId!, tenantId, deletedAt: null }, select: { id: true } });
      if (!c) throw new NotFoundException('Komentar tidak ditemukan');
    }
    const existing = await this.prisma.forumReaction.findFirst({ where: { tenantId, targetType: targetType as any, userId: actor.userId, reactionType: reactionType as any,
      ...(targetType === 'THREAD' ? { threadId: params.threadId! } : { commentId: params.commentId! }) } });
    if (existing) { await this.prisma.forumReaction.delete({ where: { id: existing.id } }); return { reacted: false, reactionType }; }
    const created = await this.prisma.forumReaction.create({ data: { tenantId, targetType: targetType as any,
      threadId: targetType === 'THREAD' ? params.threadId! : null, commentId: targetType === 'COMMENT' ? params.commentId! : null,
      userId: actor.userId, reactionType: reactionType as any } });
    return { reacted: true, reaction: created };
  }

  async votePoll(tenantId: string, threadId: string, optionIndex: number) {
    const thread = await this.prisma.forumThread.findFirst({ where: { id: threadId, tenantId, deletedAt: null }, select: { id: true, type: true, pollOptions: true, isLocked: true } });
    if (!thread) throw new NotFoundException('Thread forum tidak ditemukan');
    if ((thread.type as unknown as string) !== 'POLL') throw new BadRequestException('Thread ini bukan polling');
    if (thread.isLocked) throw new ForbiddenException('Polling dikunci');
    const options = (thread.pollOptions ?? []) as Array<{ text: string; votes: number }>;
    if (!Array.isArray(options) || optionIndex < 0 || optionIndex >= options.length) throw new BadRequestException('optionIndex di luar rentang opsi polling');
    options[optionIndex] = { text: options[optionIndex].text, votes: (options[optionIndex].votes ?? 0) + 1 };
    return this.prisma.forumThread.update({ where: { id: threadId }, data: { pollOptions: options as any }, select: { id: true, pollOptions: true } });
  }

  async reportContent(tenantId: string, actor: ForumActor, params: { threadId?: string; commentId?: string }, dto: ReportForumContentDto) {
    let targetType: 'THREAD' | 'COMMENT';
    if (params.threadId && !params.commentId) targetType = 'THREAD';
    else if (params.commentId && !params.threadId) targetType = 'COMMENT';
    else throw new BadRequestException('Isi threadId ATAU commentId (salah satu)');
    return this.prisma.forumReport.create({ data: { tenantId, targetType: targetType as any,
      threadId: targetType === 'THREAD' ? params.threadId! : null, commentId: targetType === 'COMMENT' ? params.commentId! : null,
      reportedBy: actor.userId, reason: dto.reason } });
  }

  async listReports(tenantId: string, status?: string) {
    const where: any = { tenantId }; if (status) where.status = status;
    return this.prisma.forumReport.findMany({ where,
      include: { reporter: { select: { id: true, fullName: true } }, reviewer: { select: { id: true, fullName: true } }, thread: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' } });
  }

  async reviewReport(tenantId: string, actor: ForumActor, id: string, dto: ReviewForumReportDto) {
    const report = await this.prisma.forumReport.findFirst({ where: { id, tenantId } });
    if (!report) throw new NotFoundException('Laporan tidak ditemukan');
    return this.prisma.forumReport.update({ where: { id }, data: { status: dto.status as any, reviewedBy: actor.userId, reviewedAt: new Date() } });
  }
}
