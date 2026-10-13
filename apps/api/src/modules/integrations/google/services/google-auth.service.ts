import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';

/** OAuth2 token endpoint for service-account JWT exchange. */
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
/** Refresh margin so an in-flight request never races token expiry. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const TOKEN_LIFETIME_SECONDS = 3600;

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user',
  'https://www.googleapis.com/auth/calendar',
];

/**
 * Exchanges a Google service-account JWT (RS256, domain-wide delegation via
 * `GOOGLE_ADMIN_SUBJECT`) for an OAuth2 access token and caches it until
 * shortly before expiry.
 *
 * Required env: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY`
 * (PEM; may be base64-encoded for .env files), `GOOGLE_ADMIN_SUBJECT`.
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private cached?: { token: string; expiresAt: number };

  constructor(private readonly config: ConfigService) {}

  private getKey(): string | undefined {
    const raw = this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!raw) return undefined;
    if (raw.includes('PRIVATE KEY')) return raw;
    // Support base64-encoded PEM so .env parsers never see raw newlines.
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      return decoded.includes('PRIVATE KEY') ? decoded : raw;
    } catch {
      return raw;
    }
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL') &&
        this.getKey() &&
        this.config.get<string>('GOOGLE_ADMIN_SUBJECT'),
    );
  }

  async getAccessToken(scopes: string[] = GOOGLE_SCOPES): Promise<string> {
    if (this.cached && this.cached.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
      return this.cached.token;
    }

    const clientEmail = this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const privateKey = this.getKey();
    const subject = this.config.get<string>('GOOGLE_ADMIN_SUBJECT');
    if (!clientEmail || !privateKey || !subject) {
      throw new ServiceUnavailableException(
        'Google Workspace integration is not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_KEY / GOOGLE_ADMIN_SUBJECT)',
      );
    }

    const iat = Math.floor(Date.now() / 1000);
    const assertion = sign(
      {
        iss: clientEmail,
        scope: scopes.join(' '),
        aud: TOKEN_URL,
        iat,
        exp: iat + TOKEN_LIFETIME_SECONDS,
        sub: subject,
      },
      privateKey,
      { algorithm: 'RS256' },
    );

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(`Google token exchange failed (${res.status}): ${detail}`);
      throw new ServiceUnavailableException(
        `Google token exchange failed (${res.status})`,
      );
    }

    const data = (await res.json()) as { access_token: string; expires_in?: number };
    this.cached = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? TOKEN_LIFETIME_SECONDS) * 1000,
    };
    return this.cached.token;
  }

  /** Test hook — drop the cached token. */
  clearToken(): void {
    this.cached = undefined;
  }
}
