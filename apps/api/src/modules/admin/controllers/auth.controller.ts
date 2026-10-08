import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Res, Get, Req, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { PermissionsResolver } from '@common/auth/permissions.resolver';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ChangePasswordDto } from '../dto/create-user.dto';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { SkipCsrf } from '@common/decorators/skip-csrf.decorator';

@ApiTags('Admin - Authentication')
@Controller('admin/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
  @UseGuards(AuthGuard)
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

  @Post('change-password')
  @UseGuards(AuthGuard, PermissionGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
