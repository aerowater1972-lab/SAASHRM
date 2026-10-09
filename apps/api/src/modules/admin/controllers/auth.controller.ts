import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Res, Get, Req, UnauthorizedException, Param, Delete, Patch } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { SsoService } from '../services/sso.service';
import { PermissionsResolver } from '@common/auth/permissions.resolver';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ChangePasswordDto } from '../dto/create-user.dto';
import { CreateSsoConnectionDto, UpdateSsoConnectionDto } from '../dto/sso.dto';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { SkipCsrf } from '@common/decorators/skip-csrf.decorator';

// Auth brute-force budget: env-overridable so CI/e2e can run realistic
// login volumes (AUTH_LOGIN_LIMIT) while production keeps the strict 10/min.
const AUTH_LOGIN_LIMIT = Number(process.env.AUTH_LOGIN_LIMIT ?? 10);

@ApiTags('Admin - Authentication')
@Controller('admin/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly ssoService: SsoService,
    private readonly configService: ConfigService,
    private readonly permissions: PermissionsResolver,
  ) {}

  /**
   * Transitional dual auth (roadmap P0): the access token is ALSO written as
   * an httpOnly cookie so browsers stop depending on localStorage (XSS
   * persistence). The JSON body still carries the tokens for non-browser
   * clients and as fallback. AuthGuard accepts either.
   * NOTE: full cookie-only mode still needs a CSRF token for mutations.
   */
  private setAccessCookie(res: Response, accessToken: string) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
  }

  private setCsrfCookie(res: Response, csrfToken: string) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('csrf_token', csrfToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api/v1/admin/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie('refresh_token', { path: '/api/v1/admin/auth' });
  }

  private clearAccessCookie(res: Response) {
    res.clearCookie('access_token', { path: '/' });
  }

  private clearCsrfCookie(res: Response) {
    res.clearCookie('csrf_token', { path: '/' });
  }

  private generateCsrfToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  @Post('register')
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: AUTH_LOGIN_LIMIT, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new admin user (tenant-aware via x-tenant-id)' })
  async register(
    @TenantId() tenantId: string,
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(tenantId ?? 'default', dto);
    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshToken);
    const csrfToken = this.generateCsrfToken();
    this.setCsrfCookie(res, csrfToken);
    return { ...result, csrfToken };
  }

  @Post('login')
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: AUTH_LOGIN_LIMIT, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @TenantId() tenantId: string,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(tenantId, dto.email, dto.password);
    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshToken);
    const csrfToken = this.generateCsrfToken();
    this.setCsrfCookie(res, csrfToken);
    return { ...result, csrfToken };
  }

  @Post('refresh')
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: AUTH_LOGIN_LIMIT, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = refreshToken || req.cookies?.refresh_token;
    if (!token) {
      throw new UnauthorizedException('Refresh token required');
    }
    const result = await this.authService.refresh(token);
    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshToken);
    const csrfToken = this.generateCsrfToken();
    this.setCsrfCookie(res, csrfToken);
    return { ...result, csrfToken };
  }

  @Get('csrf-token')
  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a new CSRF token' })
  async getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const csrfToken = this.generateCsrfToken();
    this.setCsrfCookie(res, csrfToken);
    return { csrfToken };
  }

  @Post('logout')
  @UseGuards(AuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @Permissions('admin:auth:logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user' })
  async logout(
    @CurrentUser('sub') userId: string,
    @Body('refreshToken') refreshToken: string,
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearAccessCookie(res);
    this.clearRefreshCookie(res);
    this.clearCsrfCookie(res);
    return this.authService.logout(userId, refreshToken || req.cookies?.refresh_token);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Current session identity (for cookie-based session restore)' })
  async me(@CurrentUser() user: Record<string, unknown>) {
    const { sub, email, tenantId, employeeId } = user;
    return {
      user: { id: sub, email, tenantId, employeeId: employeeId ?? null },
      permissions: await this.permissions.resolve(String(sub)),
    };
  }

  // ---------- SSO (SAML 2.0) ----------

  @Get('sso/:tenantId/login')
  @Public()
  @SkipCsrf()
  @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
  @ApiOperation({ summary: 'Initiate SP-initiated SAML login (redirects to IdP)' })
  async ssoLogin(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const { url } = await this.ssoService.getLoginUrl(tenantId);
    return res.redirect(url);
  }

  @Post('sso/:tenantId/acs')
  @Public()
  @SkipCsrf()
  @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
  @ApiOperation({ summary: 'Assertion Consumer Service (IdP posts SAMLResponse here)' })
  async ssoAcs(
    @Param('tenantId') tenantId: string,
    @Body() body: Record<string, string>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.ssoService.handleAcs(tenantId, body);
    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshToken);
    const csrfToken = this.generateCsrfToken();
    this.setCsrfCookie(res, csrfToken);
    return { ...result, csrfToken };
  }

  @Get('sso/:tenantId/oidc/callback')
  @Public()
  @SkipCsrf()
  @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
  @ApiOperation({ summary: 'OIDC callback endpoint (receives authorization code from IdP)' })
  async ssoOidcCallback(
    @Param('tenantId') tenantId: string,
    @Req() req: Request & { query: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.ssoService.handleAcs(tenantId, {}, req.query as Record<string, string>);
    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshToken);
    const csrfToken = this.generateCsrfToken();
    this.setCsrfCookie(res, csrfToken);
    return res.redirect(this.configService.get<string>('APP_FRONTEND_URL') || 'http://localhost:3001');
  }

  @Get('sso/:tenantId/metadata')
  @Public()
  @SkipCsrf()
  @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
  @ApiOperation({ summary: 'SP metadata XML for IdP configuration' })
  async ssoMetadata(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const xml = await this.ssoService.getMetadata(tenantId);
    res.set('Content-Type', 'application/xml');
    return res.send(xml);
  }

  @Get('sso/:tenantId/status')
  @Public()
  @SkipCsrf()
  @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
  @ApiOperation({ summary: 'Check if SSO is enabled for tenant' })
  async ssoStatus(@Param('tenantId') tenantId: string) {
    return { enabled: await this.ssoService.isEnabled(tenantId) };
  }

  // Admin CRUD for SSO connection (requires admin:sso:* permissions)

  @Get('admin/sso/:tenantId')
  @UseGuards(AuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @Permissions('admin:sso:read')
  @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
  @ApiOperation({ summary: 'Get SSO connection details (cert masked)' })
  async getSsoConnection(@Param('tenantId') tenantId: string) {
    return this.ssoService.findConnection(tenantId);
  }

  @Post('admin/sso/:tenantId')
  @UseGuards(AuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @Permissions('admin:sso:create')
  @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
  @ApiOperation({ summary: 'Create SSO connection' })
  async createSsoConnection(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateSsoConnectionDto,
  ) {
    return this.ssoService.createConnection(tenantId, dto);
  }

  @Patch('admin/sso/:tenantId')
  @UseGuards(AuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @Permissions('admin:sso:update')
  @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
  @ApiOperation({ summary: 'Update SSO connection' })
  async updateSsoConnection(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateSsoConnectionDto,
  ) {
    return this.ssoService.updateConnection(tenantId, dto);
  }

  @Delete('admin/sso/:tenantId')
  @UseGuards(AuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @Permissions('admin:sso:delete')
  @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
  @ApiOperation({ summary: 'Delete SSO connection' })
  async deleteSsoConnection(@Param('tenantId') tenantId: string) {
    return this.ssoService.removeConnection(tenantId);
  }

  @Post('change-password')
  @UseGuards(AuthGuard, PermissionGuard)
  @Throttle({ default: { limit: AUTH_LOGIN_LIMIT, ttl: 60000 } })
  @ApiBearerAuth()
  @Permissions('admin:auth:change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the authenticated user password' })
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }
}
