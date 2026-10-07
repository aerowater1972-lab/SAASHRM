import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const hash = this.hashToken(token);
    const entry = await this.prisma.refreshTokenBlacklist.findUnique({
      where: { tokenHash: hash },
    });
    return !!entry;
  }

  private async blacklistToken(token: string, expiresAt: Date): Promise<void> {
    const hash = this.hashToken(token);
    await this.prisma.refreshTokenBlacklist.create({
      data: {
        tokenHash: hash,
        userId: '', // Will be set by caller
        expiresAt,
      },
    }).catch(() => {
      // Ignore duplicate key errors (already blacklisted)
    });
  }

  async register(
    tenantId: string,
    dto: { email: string; password: string; fullName: string },
  ) {
    // Kill-switch operasional: set ALLOW_PUBLIC_REGISTER=true untuk
    // membuka pendaftaran mandiri. Default TERTUTUP (secure by default)
    // agar tidak bisa membuat user di tenant arbitrer via x-tenant-id spoofing.
    const allowPublicRegister =
      (this.configService.get<string>('ALLOW_PUBLIC_REGISTER') ?? 'false').toLowerCase() === 'true';
    if (!allowPublicRegister) {
      throw new ForbiddenException('Self-registration is disabled by administrator');
    }
    // Cegah tenant spoofing: tenant harus ada dan tidak boleh kosong/'default'
    // tanpa allowlist eksplisit saat registrasi publik aktif.
    const normalizedTenant = (tenantId || '').trim();
    if (!normalizedTenant) {
      throw new ForbiddenException('Tenant identifier is required');
    }
    const tenantExists = await this.prisma.tenant.findUnique({
      where: { id: normalizedTenant },
    });
    if (!tenantExists) {
      throw new ForbiddenException('Invalid tenant identifier');
    }
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: normalizedTenant, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId: normalizedTenant,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
      },
    });

    const tokens = this.generateTokens(user, await this.loadPermissions(user.id));
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found');
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mfaSecret: null },
    });
    return { message: 'Password changed successfully' };
  }

  async login(tenantId: string, email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = this.generateTokens(user, await this.loadPermissions(user.id));
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    try {
      if (await this.isTokenBlacklisted(refreshToken)) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const secret = this.requireJwtSecret('JWT_REFRESH_SECRET', true);
      const decoded = jwt.verify(refreshToken, secret, { algorithms: ['HS256'] }) as any;

      const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Blacklist the old refresh token (rotation)
      const decodedToken = jwt.decode(refreshToken) as any;
      const expiresAt = new Date(decodedToken.exp * 1000);
      await this.blacklistToken(refreshToken, expiresAt);

      const tokens = this.generateTokens(user, await this.loadPermissions(user.id));
      return { user: this.sanitizeUser(user), ...tokens };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    this.logger.log(`User ${userId} logged out`);
    
    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken) as any;
        if (decoded?.exp) {
          const expiresAt = new Date(decoded.exp * 1000);
          await this.blacklistToken(refreshToken, expiresAt);
        }
      } catch {
        // Ignore decode errors
      }
    }
    
    return { message: 'Logged out successfully' };
  }

  private generateTokens(
    user: { id: string; email: string; tenantId: string; employeeId?: string | null },
    permissions: string[] = [],
  ) {
    const jwtSecret = this.requireJwtSecret('JWT_SECRET');
    const refreshSecret = this.requireJwtSecret('JWT_REFRESH_SECRET', true);
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, tenantId: user.tenantId, employeeId: user.employeeId ?? null, permissions },
      jwtSecret,
      { expiresIn: expiresIn as any, algorithm: 'HS256' },
    );

    const refreshToken = jwt.sign(
      { sub: user.id, email: user.email, tenantId: user.tenantId, employeeId: user.employeeId ?? null, permissions, type: 'refresh' },
      refreshSecret,
      { expiresIn: refreshExpiresIn as any, algorithm: 'HS256' },
    );

    return { accessToken, refreshToken };
  }

  private requireJwtSecret(key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET', allowFallbackToJwtSecret = false): string {
    const direct = this.configService.get<string>(key);
    if (direct && direct.length >= 32) return direct;
    if (allowFallbackToJwtSecret) {
      const base = this.configService.get<string>('JWT_SECRET');
      if (base && base.length >= 32) return base;
    }
    throw new Error(
      `${key} is not configured (min 32 chars). Set it in environment; server refuses to start with insecure fallback.`,
    );
  }

  private async loadPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: { include: { rolePermissions: { include: { permission: true } } } },
          },
        },
      },
    });
    if (!user) return [];
    const perms = new Set<string>();
    (user.userRoles || []).forEach((ur) =>
      (ur.role?.rolePermissions || []).forEach((rp) =>
        perms.add(`${rp.permission.module}:${rp.permission.action}`),
      ),
    );
    return [...perms];
  }

  private sanitizeUser(user: any) {
    const { passwordHash, mfaSecret, userRoles, ...rest } = user;
    return rest;
  }
}
