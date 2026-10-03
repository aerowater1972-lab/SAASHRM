import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ChangePasswordDto } from '../dto/create-user.dto';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';

@ApiTags('Admin - Authentication')
@Controller('admin/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
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

  private clearAccessCookie(res: Response) {
    res.clearCookie('access_token', { path: '/' });
  }

  @Post('register')
  @Public()
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
    return result;
  }

  @Post('login')
  @Public()
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
    return result;
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(refreshToken);
    this.setAccessCookie(res, result.accessToken);
    return result;
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Permissions('admin:auth:logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user' })
  async logout(
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearAccessCookie(res);
    return this.authService.logout(userId);
  }

  @Post('change-password')
  @UseGuards(AuthGuard, PermissionGuard)
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
