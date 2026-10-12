import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@common/prisma/prisma.service';
import { HelpdeskTicketService, SLA_MATRIX } from './helpdesk-ticket.service';

/**
 * Mock Prisma untuk unit test HelpdeskTicketService.
 * Hanya method yang dipakai service yang di-mock.
 */
function buildPrismaMock() {
  return {
    employee: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    helpdeskTicket: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    helpdeskComment: { create: jest.fn() },
    helpdeskKbArticle: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}

type PrismaMock = ReturnType<typeof buildPrismaMock>;

describe('HelpdeskTicketService', () => {
  let service: HelpdeskTicketService;
  let prisma: PrismaMock;

  const TENANT = 'tenant-1';
  const EMPLOYEE = 'emp-1';
  const TICKET = 'ticket-1';

  beforeEach(async () => {
    prisma = buildPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        HelpdeskTicketService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(HelpdeskTicketService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createTicket ──────────────────────────────────────────────

  describe('createTicket', () => {
    it('membuat ticket dengan SLA jatuh tempo', async () => {
      prisma.employee.findFirst.mockResolvedValue({ id: EMPLOYEE });
      prisma.helpdeskTicket.findFirst.mockResolvedValue(null); // belum ada ticket bulan ini
      prisma.helpdeskTicket.create.mockResolvedValue({
        id: TICKET,
        ticketNumber: 'HD-202601-0001',
        status: 'OPEN',
      });

      const result = await service.createTicket(TENANT, EMPLOYEE, {
        category: 'PAYROLL',
        title: '  Gaji belum masuk  ',
        description: 'Gaji Januari belum diterima',
      });

      expect(result.ticketNumber).toBe('HD-202601-0001');
      // Judul harus di-trim
      expect(prisma.helpdeskTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Gaji belum masuk',
            priority: 'NORMAL',
            status: 'OPEN',
          }),
        }),
      );
      const call = prisma.helpdeskTicket.create.mock.calls[0][0] as any;
      expect(call.data.slaDueAt).toBeInstanceOf(Date);
      expect(call.data.firstResponseDueAt).toBeInstanceOf(Date);
    });

    it('menolak bila employee tidak ada di tenant', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      await expect(
        service.createTicket(TENANT, EMPLOYEE, {
          category: 'LEAVE',
          title: 'x',
          description: 'y',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getTicket (akses) ─────────────────────────────────────────

  describe('getTicket', () => {
    it('employee melihat ticket miliknya sendiri', async () => {
      prisma.helpdeskTicket.findFirst.mockResolvedValue({
        id: TICKET,
        employeeId: EMPLOYEE,
        comments: [],
      });
      const result = await service.getTicket(TENANT, TICKET, {
        userId: 'u1',
        employeeId: EMPLOYEE,
        isAdmin: false,
      });
      expect(result.id).toBe(TICKET);
    });

    it('employee tidak boleh melihat ticket orang lain', async () => {
      prisma.helpdeskTicket.findFirst.mockResolvedValue({
        id: TICKET,
        employeeId: 'emp-lain',
        comments: [],
      });
      await expect(
        service.getTicket(TENANT, TICKET, {
          userId: 'u1',
          employeeId: EMPLOYEE,
          isAdmin: false,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── addComment ────────────────────────────────────────────────

  describe('addComment', () => {
    it('employee komentar selalu public meski kirim isInternal=true', async () => {
      prisma.helpdeskTicket.findFirst.mockResolvedValue({
        id: TICKET,
        employeeId: EMPLOYEE,
        status: 'IN_PROGRESS',
        firstRespondedAt: new Date(),
      });
      prisma.helpdeskComment.create.mockResolvedValue({ id: 'c1', isInternal: false });

      await service.addComment(
        TENANT,
        TICKET,
        { userId: 'u1', employeeId: EMPLOYEE, isAdmin: false },
        { content: '  sudah cek  ', isInternal: true },
      );

      expect(prisma.helpdeskComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isInternal: false,
            content: 'sudah cek',
          }),
        }),
      );
    });

    it('menolak komentar pada ticket yang sudah CLOSED', async () => {
      prisma.helpdeskTicket.findFirst.mockResolvedValue({
        id: TICKET,
        employeeId: EMPLOYEE,
        status: 'CLOSED',
      });
      await expect(
        service.addComment(
          TENANT,
          TICKET,
          { userId: 'u1', employeeId: EMPLOYEE, isAdmin: false },
          { content: 'halo' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('mencatat firstRespondedAt saat admin pertama kali membalas', async () => {
      prisma.helpdeskTicket.findFirst.mockResolvedValue({
        id: TICKET,
        employeeId: EMPLOYEE,
        status: 'IN_PROGRESS',
        firstRespondedAt: null,
      });
      prisma.helpdeskComment.create.mockResolvedValue({ id: 'c1' });
      prisma.helpdeskTicket.update.mockResolvedValue({ id: TICKET });

      await service.addComment(
        TENANT,
        TICKET,
        { userId: 'admin-1', employeeId: null, isAdmin: true },
        { content: 'sedang kami proses' },
      );

      expect(prisma.helpdeskTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { firstRespondedAt: expect.any(Date) },
        }),
      );
    });
  });

  // ── rateTicket ────────────────────────────────────────────────

  describe('rateTicket', () => {
    it('menolak rating di luar 1-5', async () => {
      await expect(
        service.rateTicket(TENANT, TICKET, EMPLOYEE, 9),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak rating sebelum ticket CLOSED', async () => {
      prisma.helpdeskTicket.findFirst.mockResolvedValue({
        id: TICKET,
        employeeId: EMPLOYEE,
        status: 'RESOLVED',
      });
      await expect(
        service.rateTicket(TENANT, TICKET, EMPLOYEE, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('menerima rating valid dari pemilik setelah CLOSED', async () => {
      prisma.helpdeskTicket.findFirst.mockResolvedValue({
        id: TICKET,
        employeeId: EMPLOYEE,
        status: 'CLOSED',
      });
      prisma.helpdeskTicket.update.mockResolvedValue({
        id: TICKET,
        satisfactionRating: 5,
      });
      const result = await service.rateTicket(TENANT, TICKET, EMPLOYEE, 5);
      expect(result.satisfactionRating).toBe(5);
      expect(prisma.helpdeskTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { satisfactionRating: 5 },
        }),
      );
    });
  });

  // ── SLA ───────────────────────────────────────────────────────

  describe('SLA', () => {
    it('escalate ticket yang lewat slaDueAt & belum diescalate', async () => {
      prisma.helpdeskTicket.findMany.mockResolvedValue([
        { id: TICKET, ticketNumber: 'HD-1' },
      ]);
      prisma.helpdeskTicket.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.escalateOverdueTickets();
      expect(result.escalated).toBe(1);
      expect(prisma.helpdeskTicket.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isEscalated: true, escalatedAt: expect.any(Date) },
        }),
      );
    });

    it('tidak melakukan apa pun bila tidak ada yang overdue', async () => {
      prisma.helpdeskTicket.findMany.mockResolvedValue([]);
      const result = await service.escalateOverdueTickets();
      expect(result.escalated).toBe(0);
      expect(prisma.helpdeskTicket.updateMany).not.toHaveBeenCalled();
    });

    it('calculateSlaDue sesuai matrix URGENT', () => {
      const from = new Date('2026-01-01T00:00:00Z');
      const due = service.calculateSlaDue('URGENT', from);
      const hours = (due.getTime() - from.getTime()) / 3_600_000;
      expect(hours).toBe(SLA_MATRIX.URGENT.resolution);
    });
  });

  // ── Knowledge Base ────────────────────────────────────────────

  describe('Knowledge Base', () => {
    it('search mengembalikan artikel published yang cocok', async () => {
      prisma.helpdeskKbArticle.findMany.mockResolvedValue([
        { id: 'kb1', title: 'Cara cuti' },
      ]);
      const result = await service.searchKnowledgeBase(TENANT, 'cuti');
      expect(result).toHaveLength(1);
    });

    it('search mengabaikan query terlalu pendek', async () => {
      const result = await service.searchKnowledgeBase(TENANT, 'c');
      expect(result).toEqual([]);
      expect(prisma.helpdeskKbArticle.findMany).not.toHaveBeenCalled();
    });

    it('get article increment view count', async () => {
      prisma.helpdeskKbArticle.findFirst.mockResolvedValue({
        id: 'kb1',
        title: 'x',
        viewCount: 0,
      });
      prisma.helpdeskKbArticle.update.mockResolvedValue({ id: 'kb1', viewCount: 1 });
      await service.getKnowledgeBaseArticle(TENANT, 'kb1');
      expect(prisma.helpdeskKbArticle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { viewCount: { increment: 1 } } }),
      );
    });
  });
});


