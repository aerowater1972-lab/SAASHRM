import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    tenantId: string,
    dto: { email: string; password: string; fullName: string },
  ) {
    // Kill-switch operasional: set ALLOW_PUBLIC_REGISTER=false untuk
    // menutup pendaftaran mandiri (default TERBUKA agar kompatibel
    // dengan perilaku saat ini; ubah di environment produksi).
    const allowPublicRegister =
      (this.configService.get<string>('ALLOW_PUBLIC_REGISTER') ?? 'true').toLowerCase() !== 'false';
    if (!allowPublicRegister) {
      throw new ForbiddenException('Self-registration is disabled by administrator');
    }
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
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
      const secret = this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET') || 'fallback-secret';
      const decoded = jwt.verify(refreshToken, secret) as any;

      const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = this.generateTokens(user, await this.loadPermissions(user.id));
      return { user: this.sanitizeUser(user), ...tokens };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    this.logger.log(`User ${userId} logged out`);
    return { message: 'Logged out successfully' };
  }

  private generateTokens(
    user: { id: string; email: string; tenantId: string; employeeId?: string | null },
    permissions: string[] = [],
  ) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'fallback-secret';
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || jwtSecret;
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, tenantId: user.tenantId, employeeId: user.employeeId ?? null, permissions },
      jwtSecret,
      { expiresIn: expiresIn as any },
    );

    const refreshToken = jwt.sign(
      { sub: user.id, email: user.email, tenantId: user.tenantId, employeeId: user.employeeId ?? null, permissions },
      refreshSecret,
      { expiresIn: refreshExpiresIn as any },
    );

    return { accessToken, refreshToken };
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
