import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  HelpdeskTicketCategory,
  HelpdeskTicketPriority,
  HelpdeskTicketStatus,
  Prisma,
} from '@prisma/client';

/** Semua status ticket yang valid. */
export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
] as const;

/** Semua kategori ticket yang valid. */
export const TICKET_CATEGORIES = [
  'PAYROLL',
  'LEAVE',
  'DOCUMENT',
  'POLICY',
  'BENEFIT',
  'OTHER',
] as const;

/** Semua prioritas ticket yang valid. */
export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

/**
 * Matrix SLA helpdesk (dalam jam).
 * - firstResponse: batas waktu admin pertama kali membalas.
 * - resolution: batas waktu ticket selesai (dipakai untuk `slaDueAt`).
 */
export const SLA_MATRIX: Record<
  HelpdeskTicketPriority,
  { firstResponse: number; resolution: number }
> = {
  URGENT: { firstResponse: 4, resolution: 4 },
  HIGH: { firstResponse: 8, resolution: 24 },
  NORMAL: { firstResponse: 24, resolution: 72 },
  LOW: { firstResponse: 48, resolution: 120 },
};

/** Transisi status yang diizinkan. */
const STATUS_FLOW: Record<HelpdeskTicketStatus, HelpdeskTicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: [],
};

/** Pihak yang melakukan aksi pada ticket. */
export interface TicketActor {
  userId: string;
  employeeId: string | null;
  isAdmin: boolean;
}

export interface CreateTicketDto {
  category: (typeof TICKET_CATEGORIES)[number];
  title: string;
  description: string;
  priority?: (typeof TICKET_PRIORITIES)[number];
}

export interface CreateKbArticleDto {
  category?: (typeof TICKET_CATEGORIES)[number];
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateKbArticleDto {
  category?: (typeof TICKET_CATEGORIES)[number];
  title?: string;
  content?: string;
  tags?: string[];
}

@Injectable()
export class HelpdeskTicketService {
  constructor(private readonly prisma: PrismaService) {}

  /** SLA jatuh tempo resolusi untuk suatu prioritas. */
  calculateSlaDue(
    priority: HelpdeskTicketPriority,
    from: Date = new Date(),
  ): Date {
    return new Date(from.getTime() + SLA_MATRIX[priority].resolution * 3_600_000);
  }

  async createTicket(
    tenantId: string,
    employeeId: string,
    dto: CreateTicketDto,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee tidak ditemukan');
    }

    const title = dto.title?.trim();
    if (!title) {
      throw new BadRequestException('Judul ticket wajib diisi');
    }

    const priority = (dto.priority ?? 'NORMAL') as HelpdeskTicketPriority;
    const now = new Date();

    return this.prisma.helpdeskTicket.create({
      data: {
        tenantId,
        employeeId,
        ticketNumber: await this.generateTicketNumber(tenantId),
        category: dto.category,
        priority,
        status: HelpdeskTicketStatus.OPEN,
        title,
        description: dto.description?.trim() ?? '',
        slaDueAt: this.calculateSlaDue(priority, now),
        firstResponseDueAt: new Date(
          now.getTime() + SLA_MATRIX[priority].firstResponse * 3_600_000,
        ),
      },
    });
  }

  private async generateTicketNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const prefix = `HD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;
    const last = await this.prisma.helpdeskTicket.findFirst({
      where: { tenantId, ticketNumber: { startsWith: prefix } },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });
    const nextSeq = last ? Number(last.ticketNumber.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /** Detail ticket + komentar. Employee hanya boleh melihat ticket miliknya. */
  async getTicket(tenantId: string, ticketId: string, actor: TicketActor) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId, deletedAt: null },
      include: {
        employee: { select: { id: true, fullName: true, email: true } },
        assignee: { select: { id: true, fullName: true, email: true } },
        comments: {
          where: actor.isAdmin ? {} : { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: {
            authorEmployee: { select: { id: true, fullName: true } },
            authorUser: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }
    if (!actor.isAdmin && ticket.employeeId !== actor.employeeId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke ticket ini');
    }
    return ticket;
  }

  /** Daftar ticket milik seorang employee (untuk ESS). */
  async listMyTickets(
    tenantId: string,
    employeeId: string,
    query: {
      status?: HelpdeskTicketStatus;
      page?: number;
      limit?: number;
    },
  ) {
    return this.findTickets(tenantId, { ...query, employeeId });
  }


  private async findTickets(
    tenantId: string,
    query: {
      status?: HelpdeskTicketStatus;
      category?: HelpdeskTicketCategory;
      priority?: HelpdeskTicketPriority;
      employeeId?: string;
      assignedToId?: string;
      unassignedOnly?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const where: Prisma.HelpdeskTicketWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.priority) where.priority = query.priority;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.assignedToId) where.assigneeUserId = query.assignedToId;
    if (query.unassignedOnly) where.assigneeUserId = null;

    const [items, total] = await Promise.all([
      this.prisma.helpdeskTicket.findMany({
        where,
        include: {
          employee: { select: { id: true, fullName: true, email: true } },
          assignee: { select: { id: true, fullName: true, email: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ isEscalated: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.helpdeskTicket.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Queue seluruh ticket (untuk admin/HR). */
  async listTickets(
    tenantId: string,
    query: {
      status?: HelpdeskTicketStatus;
      category?: HelpdeskTicketCategory;
      priority?: HelpdeskTicketPriority;
      assignedToId?: string;
      unassignedOnly?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    return this.findTickets(tenantId, query);
  }

  /** Tambah komentar. Employee selalu publik; admin bisa internal note. */
  async addComment(
    tenantId: string,
    ticketId: string,
    actor: TicketActor,
    dto: { content: string; attachmentUrl?: string; isInternal?: boolean },
  ) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId, deletedAt: null },
      select: { id: true, employeeId: true, status: true, firstRespondedAt: true },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }
    if (ticket.status === HelpdeskTicketStatus.CLOSED) {
      throw new BadRequestException('Ticket sudah ditutup');
    }

    const content = dto.content?.trim();
    if (!content) {
      throw new BadRequestException('Isi komentar wajib diisi');
    }

    const comment = await this.prisma.helpdeskComment.create({
      data: {
        tenantId,
        ticketId,
        content,
        attachmentUrl: dto.attachmentUrl ?? null,
        // Employee tidak boleh membuat catatan internal.
        isInternal: actor.isAdmin ? (dto.isInternal ?? false) : false,
        authorUserId: actor.userId,
        authorEmployeeId: actor.employeeId,
      },
    });

    // First response: admin pertama kali membalas -> catat waktu SLA-nya.
    if (actor.isAdmin && !ticket.firstRespondedAt) {
      await this.prisma.helpdeskTicket.update({
        where: { id: ticket.id },
        data: { firstRespondedAt: new Date() },
      });
    }

    return comment;
  }


  /** Rating kepuasan (1-5) â€” hanya pemilik ticket, setelah CLOSED. */
  async rateTicket(
    tenantId: string,
    ticketId: string,
    employeeId: string,
    rating: number,
  ) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating harus berupa bilangan bulat 1-5');
    }

    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId, deletedAt: null },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }
    if (ticket.status !== HelpdeskTicketStatus.CLOSED) {
      throw new BadRequestException(
        'Rating hanya bisa diberikan setelah ticket ditutup',
      );
    }
    if (ticket.employeeId !== employeeId) {
      throw new ForbiddenException('Hanya pemilik ticket yang bisa memberi rating');
    }

    return this.prisma.helpdeskTicket.update({
      where: { id: ticket.id },
      data: { satisfactionRating: rating },
    });
  }

  /** Assign ticket ke user admin/HR. */
  async assignTicket(tenantId: string, ticketId: string, assignedToId: string) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId, deletedAt: null },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }

    const assignee = await this.prisma.user.findFirst({
      where: { id: assignedToId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!assignee) {
      throw new NotFoundException('Penanggung jawab tidak ditemukan');
    }

    return this.prisma.helpdeskTicket.update({
      where: { id: ticket.id },
      data: {
        assigneeUserId: assignee.id,
        // Ticket yang baru di-assign langsung dikerjakan.
        ...(ticket.status === HelpdeskTicketStatus.OPEN
          ? { status: HelpdeskTicketStatus.IN_PROGRESS }
          : {}),
      },
    });
  }

  /** Ubah status ticket mengikuti transisi yang diizinkan. */
  async updateStatus(
    tenantId: string,
    ticketId: string,
    status: HelpdeskTicketStatus,
  ) {
    if (!(TICKET_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException(`Status tidak valid: ${status}`);
    }

    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId, deletedAt: null },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }
    if (!STATUS_FLOW[ticket.status].includes(status)) {
      throw new BadRequestException(
        `Transisi status tidak diizinkan: ${ticket.status} -> ${status}`,
      );
    }

    return this.prisma.helpdeskTicket.update({
      where: { id: ticket.id },
      data: {
        status,
        ...(status === HelpdeskTicketStatus.RESOLVED
          ? { resolvedAt: new Date() }
          : {}),
        ...(status === HelpdeskTicketStatus.CLOSED
          ? { closedAt: new Date() }
          : {}),
        // Re-open: reset timestamp resolusi/penutupan.
        ...(status === HelpdeskTicketStatus.OPEN
          ? { resolvedAt: null, closedAt: null }
          : {}),
      },
    });
  }


  /**
   * Tandai ticket yang melewati SLA resolusi sebagai ESCALATED.
   * Dipanggil cron tiap 10 menit (lihat helpdesk.sla.cron.ts) â€” lintas tenant.
   */
  async escalateOverdueTickets() {
    const now = new Date();
    const overdue = await this.prisma.helpdeskTicket.findMany({
      where: {
        deletedAt: null,
        status: { not: HelpdeskTicketStatus.CLOSED },
        isEscalated: false,
        slaDueAt: { lt: now },
      },
      select: { id: true },
    });
    if (overdue.length === 0) {
      return { escalated: 0 };
    }

    const result = await this.prisma.helpdeskTicket.updateMany({
      where: { id: { in: overdue.map((t) => t.id) } },
      data: { isEscalated: true, escalatedAt: now },
    });
    return { escalated: result.count };
  }

  /** Statistik helpdesk untuk dashboard admin. */
  async getStats(tenantId: string) {
    const now = new Date();
    const [byStatus, byCategory, byPriority, overdueCount, resolved, total, satisfactionAgg] =
      await Promise.all([
        this.prisma.helpdeskTicket.groupBy({
          by: ['status'],
          where: { tenantId, deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.helpdeskTicket.groupBy({
          by: ['category'],
          where: { tenantId, deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.helpdeskTicket.groupBy({
          by: ['priority'],
          where: { tenantId, deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.helpdeskTicket.count({
          where: {
            tenantId,
            deletedAt: null,
            firstRespondedAt: null,
            firstResponseDueAt: { lt: now },
          },
        }),
        this.prisma.helpdeskTicket.findMany({
          where: { tenantId, deletedAt: null, resolvedAt: { not: null } },
          select: {
            createdAt: true,
            resolvedAt: true,
            firstRespondedAt: true,
            firstResponseDueAt: true,
          },
        }),
        this.prisma.helpdeskTicket.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.helpdeskTicket.aggregate({
          where: { tenantId, deletedAt: null, satisfactionRating: { not: null } },
          _avg: { satisfactionRating: true },
          _count: { satisfactionRating: true },
        }),
      ]);

    const to = (rows: Array<Record<string, any>>, key: string) =>
      Object.fromEntries(rows.map((r) => [r[key], r._count._all]));

    const resolutionHours = resolved
      .filter((t) => t.resolvedAt)
      .map((t) => (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3_600_000);
    const withFirstResponse = resolved.filter((t) => t.firstRespondedAt);
    const firstResponseHours = withFirstResponse.map(
      (t) => (t.firstRespondedAt!.getTime() - t.createdAt.getTime()) / 3_600_000,
    );
    const slaMet = withFirstResponse.filter(
      (t) => t.firstResponseDueAt && t.firstRespondedAt! <= t.firstResponseDueAt,
    ).length;

    const avg = (arr: number[]) =>
      arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

    return {
      total,
      overdueCount,
      byStatus: to(byStatus, 'status'),
      byCategory: to(byCategory, 'category'),
      byPriority: to(byPriority, 'priority'),
      avgResolutionHours: avg(resolutionHours),
      avgFirstResponseHours: avg(firstResponseHours),
      slaComplianceRate: withFirstResponse.length
        ? Math.round((slaMet / withFirstResponse.length) * 100)
        : 100,
      avgSatisfaction: Math.round((satisfactionAgg._avg.satisfactionRating ?? 0) * 10) / 10,
      satisfactionCount: satisfactionAgg._count.satisfactionRating ?? 0,
    };
  }

  // â”€â”€ Knowledge Base â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Cari artikel KB (judul, isi, atau tag). Query < 2 char diabaikan. */
  async searchKnowledgeBase(tenantId: string, q: string, limit = 20) {
    const term = (q ?? '').trim();
    if (term.length < 2) return [];

    return this.prisma.helpdeskKbArticle.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { content: { contains: term, mode: 'insensitive' } },
          { tags: { has: term.toLowerCase() } },
        ],
      },
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(50, Math.max(1, limit)),
    });
  }

  /** Auto-suggest artikel KB dari judul ticket (untuk form buat ticket). */
  async suggestKnowledgeBase(tenantId: string, title: string, limit = 5) {
    const keywords = (title ?? '')
      .split(/\s+/)
      .map((w) => w.replace(/[^\w/-]/g, ''))
      .filter((w) => w.length > 3)
      .slice(0, 5);
    if (keywords.length === 0) return [];

    return this.prisma.helpdeskKbArticle.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: keywords.map((w) => ({
          title: { contains: w, mode: 'insensitive' as const },
        })),
      },
      orderBy: [{ viewCount: 'desc' }],
      take: Math.min(20, Math.max(1, limit)),
    });
  }

  /** Ambil satu artikel KB + tambahkan view count. */
  async getKnowledgeBaseArticle(tenantId: string, articleId: string) {
    const article = await this.prisma.helpdeskKbArticle.findFirst({
      where: { id: articleId, tenantId, deletedAt: null },
    });
    if (!article) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    await this.prisma.helpdeskKbArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });
    return { ...article, viewCount: article.viewCount + 1 };
  }

  /** Vote artikel membantu / tidak membantu. */
  async rateKnowledgeBaseArticle(tenantId: string, articleId: string, helpful: boolean) {
    const article = await this.prisma.helpdeskKbArticle.findFirst({
      where: { id: articleId, tenantId, deletedAt: null },
    });
    if (!article) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    return this.prisma.helpdeskKbArticle.update({
      where: { id: article.id },
      data: helpful
        ? { helpfulCount: { increment: 1 } }
        : { unhelpfulCount: { increment: 1 } },
    });
  }

  /** Daftar semua artikel KB untuk admin (termasuk yang soft-delete disembunyikan). */
  async listKnowledgeBaseArticles(tenantId: string, category?: string) {
    return this.prisma.helpdeskKbArticle.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(category ? { category: category as HelpdeskTicketCategory } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: { createdBy: { select: { id: true, fullName: true, email: true } } },
    });
  }

  /** Buat artikel KB baru (HD-07 admin). */
  async createKnowledgeBaseArticle(
    tenantId: string,
    userId: string,
    dto: CreateKbArticleDto,
  ) {
    const title = dto.title?.trim();
    const content = dto.content?.trim();
    if (!title) {
      throw new BadRequestException('Judul artikel wajib diisi');
    }
    if (!content) {
      throw new BadRequestException('Isi artikel wajib diisi');
    }

    return this.prisma.helpdeskKbArticle.create({
      data: {
        tenantId,
        createdByUserId: userId,
        title,
        content,
        category: (dto.category ?? 'OTHER') as HelpdeskTicketCategory,
        tags: (dto.tags ?? []).map((t) => t.toLowerCase()),
      },
    });
  }

  /** Ubah artikel KB (HD-07 admin). */
  async updateKnowledgeBaseArticle(
    tenantId: string,
    articleId: string,
    dto: UpdateKbArticleDto,
  ) {
    const article = await this.prisma.helpdeskKbArticle.findFirst({
      where: { id: articleId, tenantId, deletedAt: null },
    });
    if (!article) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    const data: Prisma.HelpdeskKbArticleUpdateInput = {};
    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) {
        throw new BadRequestException('Judul artikel tidak boleh kosong');
      }
      data.title = title;
    }
    if (dto.content !== undefined) {
      const content = dto.content.trim();
      if (!content) {
        throw new BadRequestException('Isi artikel tidak boleh kosong');
      }
      data.content = content;
    }
    if (dto.category !== undefined) {
      data.category = dto.category as HelpdeskTicketCategory;
    }
    if (dto.tags !== undefined) {
      data.tags = dto.tags.map((t) => t.toLowerCase());
    }

    return this.prisma.helpdeskKbArticle.update({
      where: { id: article.id },
      data,
    });
  }

  /** Hapus artikel KB / soft-delete (HD-07 admin). */
  async deleteKnowledgeBaseArticle(tenantId: string, articleId: string) {
    const article = await this.prisma.helpdeskKbArticle.findFirst({
      where: { id: articleId, tenantId, deletedAt: null },
    });
    if (!article) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    return this.prisma.helpdeskKbArticle.update({
      where: { id: article.id },
      data: { deletedAt: new Date() },
    });
  }
}





