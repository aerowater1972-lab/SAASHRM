import { SlackService } from './slack.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';

describe('SlackService', () => {
  let service: SlackService;
  let endpointService: any;
  let config: any;

  const endpoint = {
    id: 'ep1',
    tenantId: 't1',
    url: 'https://hooks.slack.com/services/T000/B000/X000',
    isActive: true,
  };

  beforeEach(() => {
    endpointService = {
      getActiveEndpoint: jest.fn(),
      dispatchPayload: jest.fn(),
    };
    config = { get: jest.fn() };
    service = new SlackService(endpointService, config);
  });

  const setConfig = (secret: string | undefined, nodeEnv = 'development') => {
    config.get.mockImplementation((key: string) => {
      if (key === 'SLACK_SIGNING_SECRET') return secret;
      if (key === 'NODE_ENV') return nodeEnv;
      return undefined;
    });
  };

  const sign = (secret: string, ts: string, raw: string) =>
    `v0=${createHmac('sha256', secret).update(`v0:${ts}:${raw}`).digest('hex')}`;

  describe('sendMessage (UAT TC-01-01/05)', () => {
    it('rejects when the tenant has no Slack endpoint configured', async () => {
      endpointService.getActiveEndpoint.mockResolvedValue(null);
      await expect(
        service.sendMessage({ channel: '#hr', text: 'hi' } as any, 't1'),
      ).rejects.toThrow(BadRequestException);
      expect(endpointService.dispatchPayload).not.toHaveBeenCalled();
    });

    it('rejects a payload without a channel', async () => {
      await expect(
        service.sendMessage({ text: 'hi' } as any, 't1'),
      ).rejects.toThrow(BadRequestException);
      expect(endpointService.getActiveEndpoint).not.toHaveBeenCalled();
    });

    it('dispatches via the webhook engine and returns the delivery info', async () => {
      endpointService.getActiveEndpoint.mockResolvedValue(endpoint);
      endpointService.dispatchPayload.mockResolvedValue({
        id: 'd1',
        status: 'DELIVERED',
        attempts: 1,
        createdAt: new Date('2026-10-13T00:00:00Z'),
      });

      const res = await service.sendMessage(
        { channel: '#hr', text: 'Hello', username: 'Bot' } as any,
        't1',
      );

      expect(endpointService.dispatchPayload).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({ channel: '#hr', text: 'Hello', username: 'Bot' }),
      );
      expect(res).toEqual({
        id: 'd1',
        status: 'DELIVERED',
        attempts: 1,
        createdAt: new Date('2026-10-13T00:00:00Z'),
      });
    });
  });

  describe('sendNotice (UAT TC-01-04)', () => {
    it('builds a notice payload and dispatches it', async () => {
      endpointService.getActiveEndpoint.mockResolvedValue(endpoint);
      endpointService.dispatchPayload.mockResolvedValue({
        id: 'd2',
        status: 'PENDING',
        attempts: 0,
        createdAt: new Date(),
      });

      const res = await service.sendNotice(
        { channel: '#hr', title: 'Cut-off Payroll', body: 'Jangan lupa timesheet' } as any,
        't1',
      );

      expect(endpointService.dispatchPayload).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          channel: '#hr',
          text: 'Cut-off Payroll',
          blocks: expect.arrayContaining([expect.objectContaining({ type: 'header' })]),
        }),
      );
      expect(res.status).toBe('PENDING');
    });
  });

  describe('verifySlashCommandSignature (UAT TC-01-02)', () => {
    const raw = 'text=%2Ftime&trigger_id=12345.67890';
    const currentTs = () => String(Math.floor(Date.now() / 1000));

    it('accepts a valid signature inside the tolerance window', () => {
      setConfig('s3cr3t');
      const ts = currentTs();
      expect(service.verifySlashCommandSignature(ts, sign('s3cr3t', ts, raw), raw)).toBe(true);
    });

    it('rejects a tampered body or a forged signature', () => {
      setConfig('s3cr3t');
      const ts = currentTs();
      expect(
        service.verifySlashCommandSignature(ts, sign('s3cr3t', ts, raw), `${raw}&evil=1`),
      ).toBe(false);
      expect(service.verifySlashCommandSignature(ts, 'v0=deadbeef', raw)).toBe(false);
    });

    it('rejects timestamps older than 5 minutes (replay protection)', () => {
      setConfig('s3cr3t');
      const ts = String(Math.floor(Date.now() / 1000) - 600);
      expect(service.verifySlashCommandSignature(ts, sign('s3cr3t', ts, raw), raw)).toBe(false);
    });

    it('rejects missing headers or raw body', () => {
      setConfig('s3cr3t');
      expect(service.verifySlashCommandSignature(undefined, undefined, raw)).toBe(false);
      expect(service.verifySlashCommandSignature(currentTs(), undefined, raw)).toBe(false);
      expect(service.verifySlashCommandSignature(currentTs(), 'v0=x', undefined)).toBe(false);
    });

    it('allows unsigned requests in development when the secret is unset', () => {
      setConfig(undefined, 'development');
      expect(service.verifySlashCommandSignature(undefined, undefined, undefined)).toBe(true);
    });

    it('rejects requests in production when the secret is unset', () => {
      setConfig(undefined, 'production');
      expect(() =>
        service.verifySlashCommandSignature(undefined, undefined, undefined),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('handleSlashCommand', () => {
    it('acknowledges the command with the trigger id', async () => {
      const res = await service.handleSlashCommand('/time', 'T123');
      expect(res).toEqual({
        status: 'ok',
        message: expect.stringContaining('/time'),
      });
    });
  });
});
