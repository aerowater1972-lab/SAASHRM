import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SAML } from '@node-saml/node-saml';
import {
  Configuration,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  fetchUserInfo,
  discovery,
  type ServerMetadata,
} from 'openid-client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthService } from './auth.service';
import { CreateSsoConnectionDto, UpdateSsoConnectionDto, SsoProvider } from '../dto/sso.dto';

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);
  private readonly oidcConfigs = new Map<string, Configuration>();

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

  private oidcCallbackUrl(tenantId: string): string {
    const base = (
      this.config.get<string>('PUBLIC_API_BASE_URL') || 'http://localhost:3000/api/v1'
    ).replace(/\/$/, '');
    return `${base}/admin/auth/sso/${tenantId}/oidc/callback`;
  }

  private async buildSamlProvider(tenantId: string): Promise<{ sp: SAML; connection: any }> {
    const connection = await this.prisma.ssoConnection.findUnique({ where: { tenantId } });
    if (!connection || !connection.enabled || connection.provider === 'OIDC') {
      throw new NotFoundException('SAML SSO is not enabled for this tenant');
    }
    const sp = new SAML({
      callbackUrl: this.callbackUrl(tenantId),
      entryPoint: connection.entryPoint,
      issuer: connection.issuer,
      cert: connection.cert,
      identifierFormat: connection.nameIdFormat || undefined,
      validateInResponseTo: false,
      acceptedClockSkewMs: 60_000,
    } as never);
    return { sp, connection };
  }

  private async getOidcConfig(tenantId: string): Promise<{ config: Configuration; connection: any }> {
    const cacheKey = `oidc:${tenantId}`;
    const cached = this.oidcConfigs.get(cacheKey);
    if (cached) return { config: cached, connection: await this.prisma.ssoConnection.findUnique({ where: { tenantId } }) };

    const connection = await this.prisma.ssoConnection.findUnique({ where: { tenantId } });
    if (!connection || !connection.enabled || connection.provider !== 'OIDC') {
      throw new NotFoundException('OIDC SSO is not enabled for this tenant');
    }

    let config: Configuration;
    if (connection.discoveryUrl) {
      const server = await discovery(new URL(connection.discoveryUrl), connection.issuer ?? '', {
        client_secret: connection.clientSecret ?? undefined,
        redirect_uris: [this.oidcCallbackUrl(tenantId)],
      });
      config = server;
    } else {
if (!connection.entryPoint || !connection.tokenEndpoint) {
      throw new BadRequestException('OIDC endpoints not configured');
    }
const entryPoint = connection.entryPoint ?? '';
    const tokenEndpoint = connection.tokenEndpoint ?? '';
    const issuer = connection.issuer ?? '';
    const userInfoEndpoint = connection.userInfoEndpoint ?? undefined;
    const jwksUri = connection.jwksUri ?? undefined;
    const server: ServerMetadata = {
      issuer,
      authorization_endpoint: entryPoint,
      token_endpoint: tokenEndpoint,
      userinfo_endpoint: userInfoEndpoint,
      jwks_uri: jwksUri,
    };
    config = new Configuration(server, issuer || '', {
        client_secret: connection.clientSecret ?? undefined,
        redirect_uris: [this.oidcCallbackUrl(tenantId)],
      });
    }

    this.oidcConfigs.set(cacheKey, config);
    return { config, connection };
  }

  /** Step 1 — SP-initiated login: returns the IdP redirect URL (SAML or OIDC). */
  async getLoginUrl(tenantId: string): Promise<{ url: string }> {
    const connection = await this.prisma.ssoConnection.findUnique({ where: { tenantId } });
    if (!connection || !connection.enabled) {
      throw new NotFoundException('SSO is not enabled for this tenant');
    }

    if (connection.provider === 'OIDC') {
      const { config } = await this.getOidcConfig(tenantId);
      const url = buildAuthorizationUrl(config, {
        scope: connection.scopes?.join(' ') || 'openid email profile',
        state: tenantId,
        redirect_uri: this.oidcCallbackUrl(tenantId),
      });
      return { url: url.href };
    }

    const { sp } = await this.buildSamlProvider(tenantId);
    const host = this.config.get<string>('PUBLIC_API_BASE_URL') || 'http://localhost:3000';
    const url = await sp.getAuthorizeUrlAsync(tenantId, host, {});
    return { url };
  }

  /** SP metadata for the customer's IdP configuration. */
  async getMetadata(tenantId: string): Promise<string> {
    const connection = await this.prisma.ssoConnection.findUnique({ where: { tenantId } });
    if (!connection || !connection.enabled) {
      throw new NotFoundException('SSO is not enabled for this tenant');
    }

    if (connection.provider === 'OIDC') {
      return JSON.stringify({
        provider: 'OIDC',
        issuer: connection.issuer,
        authorization_endpoint: connection.entryPoint,
        token_endpoint: connection.tokenEndpoint,
        userinfo_endpoint: connection.userInfoEndpoint,
        jwks_uri: connection.jwksUri,
        scopes_supported: connection.scopes,
      }, null, 2);
    }

    const { sp } = await this.buildSamlProvider(tenantId);
    return sp.generateServiceProviderMetadata(null);
  }

  async isEnabled(tenantId: string): Promise<boolean> {
    const row = await this.prisma.ssoConnection.findUnique({
      where: { tenantId },
      select: { enabled: true },
    });
    return row?.enabled ?? false;
  }

  /** Step 2 — ACS: validate the IdP POST (SAML or OIDC callback), find-or-create the user (JIT), then issue session. */
  async handleAcs(tenantId: string, body: Record<string, string>, query?: Record<string, string>) {
    const connection = await this.prisma.ssoConnection.findUnique({ where: { tenantId } });
    if (!connection || !connection.enabled) {
      throw new NotFoundException('SSO is not enabled for this tenant');
    }

    let email: string;
    let fullName: string | undefined;

    if (connection.provider === 'OIDC') {
      const { config } = await this.getOidcConfig(tenantId);
      const code = query?.code;
      const state = query?.state;

      if (!code) {
        throw new BadRequestException('Missing authorization code');
      }
      if (state !== tenantId) {
        throw new UnauthorizedException('Invalid state parameter');
      }

      const tokens = await authorizationCodeGrant(
        config,
        new URL(`${this.oidcCallbackUrl(tenantId)}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`),
        { expectedState: tenantId },
      );

      const claims = tokens.claims() as Record<string, unknown>;
      email = (claims.email as string) || '';
      fullName = (claims.name as string) || (claims.preferred_username as string);

      if (!email) {
        throw new UnauthorizedException('OIDC response has no email claim');
      }
    } else {
      const { sp } = await this.buildSamlProvider(tenantId);
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
        profile = (result.profile || {}) as Record<string, any>;
      } catch (err) {
        this.logger.warn(`SAML validation failed for tenant ${tenantId}: ${(err as Error).message}`);
        throw new UnauthorizedException('Invalid SAML response');
      }

      email = profile.email || profile.nameID || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
      fullName = profile.displayName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || [profile.firstName, profile.lastName].filter(Boolean).join(' ');

      if (!email) {
        throw new UnauthorizedException('SAML response has no email identity');
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: normalizedEmail } },
    });
    if (user?.deletedAt) {
      throw new UnauthorizedException('User is deactivated');
    }
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          tenantId,
          email: normalizedEmail,
          fullName: String(fullName || normalizedEmail.split('@')[0]).slice(0, 200),
          status: 'ACTIVE',
        },
      });
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

  async findConnection(tenantId: string) {
    return this.prisma.ssoConnection.findUnique({ where: { tenantId } });
  }

  async createConnection(tenantId: string, dto: CreateSsoConnectionDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (dto.provider === 'OIDC') {
      if (!dto.clientId || !dto.clientSecret || !dto.authorizationEndpoint || !dto.tokenEndpoint) {
        throw new BadRequestException('OIDC requires clientId, clientSecret, authorizationEndpoint, and tokenEndpoint');
      }
    }

    return this.prisma.ssoConnection.create({
      data: {
        tenantId,
        provider: dto.provider ?? 'SAML',
        entryPoint: dto.entryPoint ?? dto.authorizationEndpoint,
        issuer: dto.issuer ?? dto.clientId,
        cert: dto.cert ? this.normalizeCert(dto.cert) : null,
        nameIdFormat: dto.nameIdFormat ?? 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        clientSecret: dto.clientSecret ?? null,
        tokenEndpoint: dto.tokenEndpoint ?? null,
        userInfoEndpoint: dto.userInfoEndpoint ?? null,
        jwksUri: dto.jwksUri ?? null,
        discoveryUrl: dto.discoveryUrl ?? null,
        scopes: dto.scopes ?? ['openid', 'email', 'profile'],
        enabled: dto.enabled ?? true,
      },
    });
  }

  async updateConnection(tenantId: string, dto: UpdateSsoConnectionDto) {
    const existing = await this.prisma.ssoConnection.findUnique({ where: { tenantId } });
    if (!existing) throw new NotFoundException('SSO connection not found');

    if (dto.provider && dto.provider !== existing.provider) {
      throw new BadRequestException('Provider type cannot be changed after creation');
    }

    return this.prisma.ssoConnection.update({
      where: { tenantId },
      data: {
        ...(dto.entryPoint !== undefined ? { entryPoint: dto.entryPoint } : {}),
        ...(dto.issuer !== undefined ? { issuer: dto.issuer } : {}),
        ...(dto.cert !== undefined ? { cert: this.normalizeCert(dto.cert!) } : {}),
        ...(dto.nameIdFormat !== undefined ? { nameIdFormat: dto.nameIdFormat } : {}),
        ...(dto.clientId !== undefined ? { issuer: dto.clientId } : {}),
        ...(dto.clientSecret !== undefined ? { clientSecret: dto.clientSecret } : {}),
        ...(dto.authorizationEndpoint !== undefined ? { entryPoint: dto.authorizationEndpoint } : {}),
        ...(dto.tokenEndpoint !== undefined ? { tokenEndpoint: dto.tokenEndpoint } : {}),
        ...(dto.userInfoEndpoint !== undefined ? { userInfoEndpoint: dto.userInfoEndpoint } : {}),
        ...(dto.jwksUri !== undefined ? { jwksUri: dto.jwksUri } : {}),
        ...(dto.discoveryUrl !== undefined ? { discoveryUrl: dto.discoveryUrl } : {}),
        ...(dto.scopes !== undefined ? { scopes: dto.scopes } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });
  }

  async removeConnection(tenantId: string) {
    const existing = await this.prisma.ssoConnection.findUnique({ where: { tenantId } });
    if (!existing) throw new NotFoundException('SSO connection not found');
    this.oidcConfigs.delete(`oidc:${tenantId}`);
    await this.prisma.ssoConnection.delete({ where: { tenantId } });
    return { deleted: true };
  }

  private normalizeCert(raw: string): string {
    const compact = raw.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '');
    if (!compact) throw new BadRequestException('Invalid IdP certificate');
    return compact;
  }
}