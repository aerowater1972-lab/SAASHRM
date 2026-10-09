import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SAML } from '@node-saml/node-saml';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthService } from './auth.service';
import { CreateSsoConnectionDto, UpdateSsoConnectionDto } from '../dto/sso.dto';

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  private callbackUrl(tenantId: string): string {
    const base = (
      this.config.get<string>('PUBLIC_API_BASE_URL') || 'http://localhost:3000/api/v1'
    ).replace(/\/$/, '');
    return `${base}/admin/auth/sso/${tenantId}/acs`;
  }

  private async buildProvider(tenantId: string): Promise<{ sp: SAML; connection: { id: string } }> {
    const connection = await this.prisma.ssoConnection.findUnique({
      where: { tenantId },
    });
    if (!connection || !connection.enabled) {
      throw new NotFoundException('SSO is not enabled for this tenant');
    }
    const sp = new SAML({
      callbackUrl: this.callbackUrl(tenantId),
      entryPoint: connection.entryPoint,
      issuer: connection.issuer,
      cert: connection.cert,
      identifierFormat: connection.nameIdFormat || undefined,
      // Stateless SP: we do not persist AuthnRequest IDs, so InResponseTo
      // cannot be matched. Replay risk is bounded by the IdP assertion
      // NotOnOrAfter (usually minutes) + audience restriction, both still
      // enforced by node-saml signature validation.
      validateInResponseTo: false,
      acceptedClockSkewMs: 60_000,
    } as never);
    return { sp, connection };
  }

  /** Step 1 — SP-initiated login: returns the IdP redirect URL. */
  async getLoginUrl(tenantId: string): Promise<{ url: string }> {
    const { sp } = await this.buildProvider(tenantId);
    const host = this.config.get<string>('PUBLIC_API_BASE_URL') || 'http://localhost:3000';
    const url = await sp.getAuthorizeUrlAsync(tenantId, host, {});
    return { url };
  }

  /** SP metadata for the customer's IdP configuration. */
  async getMetadata(tenantId: string): Promise<string> {
    const { sp } = await this.buildProvider(tenantId);
    return sp.generateServiceProviderMetadata(null);
  }

  async isEnabled(tenantId: string): Promise<boolean> {
    const row = await this.prisma.ssoConnection.findUnique({
      where: { tenantId },
      select: { enabled: true },
    });
    return row?.enabled ?? false;
  }

  /**
   * Step 2 — ACS: validate the IdP POST, find-or-create the user (JIT),
   * then issue a normal session through the shared token pipeline.
   */
  async handleAcs(tenantId: string, body: Record<string, string>) {
    const { sp } = await this.buildProvider(tenantId);
    const samlResponse = body?.SAMLResponse;
    if (!samlResponse) {
      throw new BadRequestException('Missing SAMLResponse');
    }
    let profile: Record<string, any>;
    try {
      const result = await sp.validatePostResponseAsync({
        SAMLResponse: samlResponse,
        RelayState: body?.RelayState,
      });
      profile = (result.profile || {}) as Record<string, unknown> as Record<string, any>;
    } catch (err) {
      this.logger.warn(`SAML validation failed for tenant ${tenantId}: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid SAML response');
    }

    const email: string | undefined =
      profile.email || profile.nameID || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
    if (!email || typeof email !== 'string') {
      throw new UnauthorizedException('SAML response has no email identity');
    }
    const normalizedEmail = email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: normalizedEmail } },
    });
    if (user?.deletedAt) {
      throw new UnauthorizedException('User is deactivated');
    }
    if (!user) {
      const fullName: string =
        profile.displayName ||
        profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
        [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
        normalizedEmail.split('@')[0];
      user = await this.prisma.user.create({
        data: {
          tenantId,
          email: normalizedEmail,
          fullName: String(fullName).slice(0, 200),
          status: 'ACTIVE',
        },
      });
      // Link to an existing employee record with the same email when present,
      // so SSO users immediately see their ESS data.
      const employee = await this.prisma.employee.findFirst({
        where: { tenantId, email: normalizedEmail, deletedAt: null },
        select: { id: true },
      });
      if (employee) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { employeeId: employee.id },
        });
      }
      this.logger.log(`SSO JIT-provisioned user ${normalizedEmail} in tenant ${tenantId}`);
    }

    return this.authService.issueSessionForUser(user.id);
  }

  // ---------- Admin CRUD ----------

  async findConnection(tenantId: string) {
    return this.prisma.ssoConnection.findUnique({ where: { tenantId } });
  }

  async createConnection(tenantId: string, dto: CreateSsoConnectionDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.ssoConnection.create({
      data: {
        tenantId,
        entryPoint: dto.entryPoint,
        issuer: dto.issuer,
        cert: normalizeCert(dto.cert),
        nameIdFormat: dto.nameIdFormat ?? 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        enabled: dto.enabled ?? true,
      },
    });
  }

  async updateConnection(tenantId: string, dto: UpdateSsoConnectionDto) {
    const existing = await this.prisma.ssoConnection.findUnique({ where: { tenantId } });
    if (!existing) throw new NotFoundException('SSO connection not found');
    return this.prisma.ssoConnection.update({
      where: { tenantId },
      data: {
        ...(dto.entryPoint !== undefined ? { entryPoint: dto.entryPoint } : {}),
        ...(dto.issuer !== undefined ? { issuer: dto.issuer } : {}),
        ...(dto.cert !== undefined ? { cert: normalizeCert(dto.cert) } : {}),
        ...(dto.nameIdFormat !== undefined ? { nameIdFormat: dto.nameIdFormat } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });
  }

  async removeConnection(tenantId: string) {
    const existing = await this.prisma.ssoConnection.findUnique({ where: { tenantId } });
    if (!existing) throw new NotFoundException('SSO connection not found');
    await this.prisma.ssoConnection.delete({ where: { tenantId } });
    return { deleted: true };
  }
}

/** Accept pasted IdP certs with or without PEM armor/whitespace. */
function normalizeCert(raw: string): string {
  const compact = raw.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '');
  if (!compact) throw new BadRequestException('Invalid IdP certificate');
  return compact;
}
