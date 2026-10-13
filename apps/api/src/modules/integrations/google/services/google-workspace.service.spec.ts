import { BadRequestException } from '@nestjs/common';
import { GoogleWorkspaceService } from './google-workspace.service';

describe('GoogleWorkspaceService (UAT TC-02)', () => {
  let service: GoogleWorkspaceService;
  let prisma: { employee: { findMany: jest.Mock } };
  let auth: { getAccessToken: jest.Mock };
  let config: { get: jest.Mock };
  let fetchMock: jest.Mock;

  const employees = [
    { fullName: 'Budi Santoso', email: 'budi@example.com' },
    { fullName: 'Siti', email: 'siti@example.com' },
  ];

  const jsonRes = (status: number, body: any = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });

  beforeEach(() => {
    prisma = { employee: { findMany: jest.fn() } };
    auth = { getAccessToken: jest.fn().mockResolvedValue('tok-1') };
    config = { get: jest.fn().mockReturnValue(undefined) };
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    service = new GoogleWorkspaceService(prisma as any, auth as any, config as any);
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  describe('syncDirectory', () => {
    it('returns zeros without calling Google when there are no active employees', async () => {
      prisma.employee.findMany.mockResolvedValue([]);

      const result = await service.syncDirectory('t-1', {});

      expect(result).toEqual({ dryRun: false, total: 0, created: 0, updated: 0, failed: [] });
      expect(auth.getAccessToken).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('dry-run reports totals without an auth or network call', async () => {
      prisma.employee.findMany.mockResolvedValue(employees);

      const result = await service.syncDirectory('t-1', { dryRun: true });

      expect(result).toMatchObject({ dryRun: true, total: 2, created: 0, updated: 0 });
      expect(auth.getAccessToken).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't-1', status: 'ACTIVE', deletedAt: null },
        }),
      );
    });

    it('creates new Google users (POST 201)', async () => {
      prisma.employee.findMany.mockResolvedValue([employees[0]]);
      fetchMock.mockResolvedValue(jsonRes(201, { primaryEmail: 'budi@example.com' }));

      const result = await service.syncDirectory('t-1');

      expect(result).toMatchObject({ total: 1, created: 1, updated: 0, failed: [] });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('/admin/directory/v1/users');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer tok-1');
      const body = JSON.parse(init.body);
      expect(body.primaryEmail).toBe('budi@example.com');
      expect(body.name).toEqual({ givenName: 'Budi', familyName: 'Santoso' });
      expect(body.password).toBeTruthy();
    });

    it('updates when the user already exists (409 → PUT)', async () => {
      prisma.employee.findMany.mockResolvedValue([employees[0]]);
      fetchMock
        .mockResolvedValueOnce(jsonRes(409, { error: { code: 409 } }))
        .mockResolvedValueOnce(jsonRes(200, { primaryEmail: 'budi@example.com' }));

      const result = await service.syncDirectory('t-1');

      expect(result).toMatchObject({ created: 0, updated: 1, failed: [] });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toContain(encodeURIComponent('budi@example.com'));
      expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
    });

    it('collects failures without aborting the rest of the batch', async () => {
      prisma.employee.findMany.mockResolvedValue(employees);
      fetchMock
        .mockResolvedValueOnce(jsonRes(400, { error: 'bad' }))
        .mockResolvedValueOnce(jsonRes(201, {}));

      const result = await service.syncDirectory('t-1');

      expect(result.created).toBe(1);
      expect(result.failed).toEqual([
        { email: 'budi@example.com', status: 400, error: JSON.stringify({ error: 'bad' }) },
      ]);
    });

    it('records network errors as failures', async () => {
      prisma.employee.findMany.mockResolvedValue([employees[0]]);
      fetchMock.mockRejectedValue(new Error('network down'));

      const result = await service.syncDirectory('t-1');

      expect(result.failed).toEqual([{ email: 'budi@example.com', error: 'network down' }]);
    });
  });

  describe('createCalendarEvent', () => {
    const baseDto = {
      summary: 'Annual Leave',
      start: '2026-10-20',
      end: '2026-10-21',
      attendees: ['budi@example.com'],
    };

    it('rejects a missing summary', async () => {
      await expect(
        service.createCalendarEvent('t-1', { ...baseDto, summary: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unparseable datetimes', async () => {
      await expect(
        service.createCalendarEvent('t-1', { ...baseDto, start: 'not-a-date', end: '2026-10-21' }),
      ).rejects.toThrow('Start and end must be ISO dates or RFC3339 datetimes');
    });

    it('creates an all-day event on the configured calendar', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'GOOGLE_CALENDAR_ID' ? 'hr@example.com' : undefined,
      );
      fetchMock.mockResolvedValue(
        jsonRes(200, { id: 'evt-1', status: 'confirmed', htmlLink: 'https://cal/link' }),
      );

      const result = await service.createCalendarEvent('t-1', baseDto);

      expect(result).toEqual({
        id: 'evt-1',
        status: 'confirmed',
        htmlLink: 'https://cal/link',
        hangoutLink: undefined,
      });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('/calendars/hr%40example.com/events');
      const body = JSON.parse(init.body);
      expect(body.start).toEqual({ date: '2026-10-20' });
      expect(body.end).toEqual({ date: '2026-10-21' });
      expect(body.attendees).toEqual([{ email: 'budi@example.com' }]);
    });

    it('creates a timed event with timezone for RFC3339 input', async () => {
      fetchMock.mockResolvedValue(jsonRes(200, { id: 'evt-2', status: 'confirmed' }));

      await service.createCalendarEvent('t-1', {
        summary: 'Interview',
        start: '2026-10-20T09:00:00+07:00',
        end: '2026-10-20T10:00:00+07:00',
        timezone: 'Asia/Jakarta',
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.start.dateTime).toBe('2026-10-20T02:00:00.000Z');
      expect(body.start.timeZone).toBe('Asia/Jakarta');
    });

    it('surfaces Google rejections as BadRequest', async () => {
      fetchMock.mockResolvedValue(jsonRes(403, { error: 'forbidden' }));
      await expect(service.createCalendarEvent('t-1', baseDto)).rejects.toThrow(
        'Google Calendar insert failed (403)',
      );
    });
  });
});
