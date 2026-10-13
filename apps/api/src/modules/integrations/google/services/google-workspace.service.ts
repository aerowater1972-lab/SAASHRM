import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { GoogleAuthService, GOOGLE_SCOPES } from './google-auth.service';
import { GoogleSyncDto, GoogleCalendarEventDto } from '../dto';

const DIRECTORY_USERS_URL = 'https://admin.googleapis.com/admin/directory/v1/users';
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DirectorySyncResult = {
  dryRun: boolean;
  total: number;
  created: number;
  updated: number;
  failed: Array<{ email: string; status?: number; error: string }>;
};

/** Split "Budi Santoso" → given/family name for the Google name object. */
function splitName(fullName: string): { givenName: string; familyName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { givenName: 'Employee', familyName: '_' };
  if (parts.length === 1) return { givenName: parts[0], familyName: '_' };
  return { givenName: parts[0], familyName: parts.slice(1).join(' ') };
}

/**
 * TC-02 Google Workspace connector: directory sync (employee → Google user,
 * Admin SDK Directory API) and Calendar insert. Calls go direct (request/
 * response CRUD does not fit the fire-and-forget webhook engine); auth uses a
 * service account with domain-wide delegation (env: GOOGLE_SERVICE_ACCOUNT_*,
 * GOOGLE_ADMIN_SUBJECT, GOOGLE_CALENDAR_ID, GOOGLE_ORG_UNIT_PATH).
 */
@Injectable()
export class GoogleWorkspaceService {
  private readonly logger = new Logger(GoogleWorkspaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: GoogleAuthService,
    private readonly config: ConfigService,
  ) {}

  async syncDirectory(tenantId: string, dto: GoogleSyncDto = {}): Promise<DirectorySyncResult> {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
      select: { fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });

    const base = { dryRun: Boolean(dto.dryRun), total: employees.length };
    if (employees.length === 0) {
      return { ...base, created: 0, updated: 0, failed: [] };
    }
    if (dto.dryRun) {
      this.logger.log(`Google directory sync dry-run: ${employees.length} user(s) would be synced`);
      return { ...base, created: 0, updated: 0, failed: [] };
    }

    const token = await this.auth.getAccessToken(GOOGLE_SCOPES);
    const orgUnitPath = this.config.get<string>('GOOGLE_ORG_UNIT_PATH') || '/';
    let created = 0;
    let updated = 0;
    const failed: DirectorySyncResult['failed'] = [];

    for (const emp of employees) {
      const { givenName, familyName } = splitName(emp.fullName);
      const body: Record<string, any> = {
        primaryEmail: emp.email,
        name: { givenName, familyName },
        orgUnitPath,
      };
      try {
        let res = await fetch(DIRECTORY_USERS_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...body,
            password: randomBytes(12).toString('base64url'),
            changePasswordNextLogin: true,
          }),
        });
        if (res.status === 409) {
          // Already exists in Google → update instead of failing the sync.
          res = await fetch(`${DIRECTORY_USERS_URL}/${encodeURIComponent(emp.email)}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        }
        if (res.ok) {
          res.status === 200 ? updated++ : created++;
        } else {
          const detail = await res.text().catch(() => '');
          failed.push({ email: emp.email, status: res.status, error: detail.slice(0, 300) });
        }
      } catch (err: any) {
        failed.push({ email: emp.email, error: err?.message || String(err) });
      }
    }

    this.logger.log(
      `Google directory sync finished: total=${employees.length} created=${created} updated=${updated} failed=${failed.length}`,
    );
    return { ...base, created, updated, failed };
  }

  async createCalendarEvent(tenantId: string, dto: GoogleCalendarEventDto) {
    if (!dto?.summary || typeof dto.summary !== 'string') {
      throw new BadRequestException('Summary is required');
    }
    if (!dto.start || !dto.end) {
      throw new BadRequestException('Start and end are required');
    }

    const allDay = DATE_ONLY_RE.test(dto.start) && DATE_ONLY_RE.test(dto.end);
    if (allDay) {
      if (dto.end < dto.start) {
        throw new BadRequestException('End must not be before start');
      }
    } else if (Number.isNaN(Date.parse(dto.start)) || Number.isNaN(Date.parse(dto.end))) {
      throw new BadRequestException('Start and end must be ISO dates or RFC3339 datetimes');
    }

    const token = await this.auth.getAccessToken(GOOGLE_SCOPES);
    const calendarId = encodeURIComponent(
      this.config.get<string>('GOOGLE_CALENDAR_ID') || 'primary',
    );
    const timezone = this.config.get<string>('GOOGLE_TIMEZONE') || dto.timezone || 'Asia/Jakarta';

    const body: Record<string, any> = {
      summary: dto.summary,
      description: dto.description,
      ...(allDay
        ? { start: { date: dto.start }, end: { date: dto.end } }
        : {
            start: { dateTime: new Date(dto.start).toISOString(), timeZone: timezone },
            end: { dateTime: new Date(dto.end).toISOString(), timeZone: timezone },
          }),
      ...(dto.attendees?.length
        ? { attendees: dto.attendees.map((email) => ({ email })) }
        : {}),
    };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events${
        dto.sendUpdates ? `?sendUpdates=${dto.sendUpdates}` : ''
      }`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(`Google Calendar insert failed (${res.status}): ${detail}`);
      throw new BadRequestException(`Google Calendar insert failed (${res.status})`);
    }

    const event = (await res.json()) as {
      id?: string;
      status?: string;
      htmlLink?: string;
      hangoutLink?: string;
    };
    this.logger.log(`Google Calendar event created (tenant=${tenantId}, id=${event.id})`);
    return {
      id: event.id,
      status: event.status,
      htmlLink: event.htmlLink,
      hangoutLink: event.hangoutLink,
    };
  }
}
