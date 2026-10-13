import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { createHmac, createHash } from 'crypto';
import { WebhookService } from './webhook.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '@modules/admin/services/audit.service';

/**
 * OA-03 — Webhook Engine.
 */
describe('WebhookService (OA-03)', () => {
  let service: WebhookService;

  const mockPrisma = {
    webhookEndpoint: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    webhookDelivery: {
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };
  const mockAudit = { ingest: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('stores a hashed secret and returns the plaintext once', async () => {
      mockPrisma.webhookEndpoint.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'ep1', ...data }),
      );

      const result: any = await service.create(
        't1',
        { url: 'https://example.com/hook', events: ['leave.approved'] },
        'actor1',
      );

      expect(result.secret).toMatch(/^whsec_/);
      // The stored hash must never contain the plaintext secret.
      expect(result.secretHash).not.toContain(result.secret);
      expect(result.secretHash).toBe(createHash('sha256').update(result.secret).digest('hex'));
      expect(mockAudit.ingest).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'webhook_endpoint', action: 'CREATE' }),
      );
    });
  });

  describe('findOne / tenant scoping', () => {
    it('throws NotFound when the endpoint is outside the tenant', async () => {
      mockPrisma.webhookEndpoint.findFirst.mockResolvedValue(null);
      await expect(service.findOne('t1', 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('enqueueForEvent', () => {
    it('creates one PENDING delivery per subscribed endpoint', async () => {
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
        { id: 'ep1', events: ['leave.approved'] },
        { id: 'ep2', events: ['*'] },
        { id: 'ep3', events: ['payroll.run.locked'] },
      ]);
      mockPrisma.webhookDelivery.createMany.mockResolvedValue({ count: 2 });

      const count = await service.enqueueForEvent('t1', 'leave.approved', { id: 'x' });

      expect(count).toBe(2);
      expect(mockPrisma.webhookDelivery.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ endpointId: 'ep1', event: 'leave.approved', status: 'PENDING' }),
            expect.objectContaining({ endpointId: 'ep2', event: 'leave.approved' }),
          ]),
        }),
      );
    });

    it('returns 0 when no endpoint subscribes to the event', async () => {
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([{ id: 'ep1', events: ['payroll.run.locked'] }]);
      const count = await service.enqueueForEvent('t1', 'leave.approved', {});
      expect(count).toBe(0);
      expect(mockPrisma.webhookDelivery.createMany).not.toHaveBeenCalled();
    });

    it('returns 0 (never throws) when tenantId is missing', async () => {
      const count = await service.enqueueForEvent(undefined, 'leave.approved', {});
      expect(count).toBe(0);
    });
  });

  describe('deliverDue', () => {
    const delivery = (over: any = {}) => ({
      id: 'd1',
      tenantId: 't1',
      endpointId: 'ep1',
      event: 'leave.approved',
      payload: { id: 'x' },
      status: 'PENDING',
      attempts: 0,
      endpoint: {
        id: 'ep1',
        url: 'https://example.com/hook',
        secretHash: 'deadbeef',
        isActive: true,
        deletedAt: null,
      },
      ...over,
    });

    afterEach(() => {
      (global as any).fetch = undefined;
    });

    it('marks DELIVERED on a 2xx response', async () => {
      mockPrisma.webhookDelivery.findMany.mockResolvedValue([delivery()]);
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'ok',
      });

      const result = await service.deliverDue();

      expect(result).toEqual({ delivered: 1, failed: 0 });
      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'd1' },
          data: expect.objectContaining({ status: 'DELIVERED', attempts: 1, responseStatus: 200 }),
        }),
      );
      // Signature header is present.
      const call = (global as any).fetch.mock.calls[0];
      expect(call[1].headers['x-webhook-signature']).toMatch(/^sha256=/);
      expect(call[1].headers['x-webhook-event']).toBe('leave.approved');
    });

    it('reschedules with exponential backoff on a 5xx response', async () => {
      mockPrisma.webhookDelivery.findMany.mockResolvedValue([delivery({ attempts: 1 })]);
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'err',
      });

      const now = new Date('2026-01-01T00:00:00Z');
      const result = await service.deliverDue(50, now);

      expect(result.delivered).toBe(0);
      const call = mockPrisma.webhookDelivery.update.mock.calls[0][0];
      expect(call.data.attempts).toBe(2);
      expect(call.data.errorMsg).toBe('HTTP 500');
      // Second attempt → 120s backoff.
      expect(call.data.nextRetryAt.getTime()).toBe(now.getTime() + 120_000);
    });

    it('marks FAILED permanently once max attempts are exhausted', async () => {
      mockPrisma.webhookDelivery.findMany.mockResolvedValue([delivery({ attempts: 5 })]);
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'err',
      });

      const result = await service.deliverDue();

      expect(result.failed).toBe(1);
      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED', attempts: 6 }),
        }),
      );
    });

    it('marks FAILED when the endpoint is inactive', async () => {
      mockPrisma.webhookDelivery.findMany.mockResolvedValue([
        delivery({ endpoint: { id: 'ep1', url: 'x', secretHash: 'y', isActive: false, deletedAt: null } }),
      ]);
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      (global as any).fetch = jest.fn();

      const result = await service.deliverDue();

      expect(result.failed).toBe(1);
      expect((global as any).fetch).not.toHaveBeenCalled();
    });
  });

  describe('sign / verifySignature', () => {
    it('produces a stable HMAC and verifies round-trip', () => {
      const secret = 'whsec_test';
      const body = JSON.stringify({ a: 1 });
      const expected = createHmac('sha256', secret).update(body).digest('hex');

      expect(service.sign(secret, body)).toBe(expected);
      expect(service.verifySignature(secret, body, `sha256=${expected}`)).toBe(true);
      expect(service.verifySignature(secret, body, 'sha256=wrong')).toBe(false);
    });
  });
});

