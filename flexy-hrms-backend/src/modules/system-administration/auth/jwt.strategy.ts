import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  roles?: string[];
}

/**
 * Validasi JWT (access token) yang diterbitkan saat login. Alur
 * login/issuance token itu sendiri (username+password -> JWT) berada di
 * luar cakupan increment Sprint 1 ini — diasumsikan terintegrasi dengan
 * identity provider terpisah (lihat Technical Architecture Document,
 * ADR terbuka soal strategi auth) pada increment berikutnya.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'change-me-in-production'),
    });
  }

  async validate(payload: JwtPayload) {
    // Nilai return di sini menjadi `request.user` (lihat CurrentUser decorator).
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      roles: payload.roles ?? [],
    };
  }
}
