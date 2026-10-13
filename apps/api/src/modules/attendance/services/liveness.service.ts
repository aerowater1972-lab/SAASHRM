import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export type LivenessAction = 'BLINK' | 'TURN_HEAD';

export interface LivenessEvent {
  action: LivenessAction;
  /** Epoch ms — kapan klien mendeteksi gerakan selesai. */
  at: number;
}

interface LivenessChallenge {
  id: string;
  tenantId: string;
  employeeId: string;
  actions: LivenessAction[];
  issuedAt: number;
  expiresAt: number;
  used: boolean;
}

/**
 * Liveness challenge (gap parity "Liveness Detection" Talenta):
 * 1. Klien minta challenge → server pilih urutan gerakan acak (BLINK/TURN_HEAD).
 * 2. Klien menyelesaikan gerakan, kirim events dengan timestamp.
 * 3. Server validasi urutan + jendela waktu → terbitkan token HMAC sekali pakai.
 * 4. Token dilampirkan saat verify wajah / clock-in FACE (anti photo-spoof).
 *
 * Tantangan disimpan in-memory (konsisten dengan replay-nonce di
 * BiometricService); token divalidasi via HMAC sehingga aman lintas proses
 * selama secret sama.
 */
@Injectable()
export class LivenessService {
  private readonly challenges = new Map<string, LivenessChallenge>();
  private readonly secret: string;
  private readonly requireToken: boolean;
  private readonly challengeTtlMs: number;
  private readonly tokenTtlMs: number;
  private readonly minEventGapMs: number;

  constructor(private readonly config: ConfigService) {
    this.secret =
      this.config.get<string>('LIVENESS_SECRET') ||
      this.config.get<string>('BIOMETRIC_DEVICE_SECRET') ||
      randomBytes(32).toString('hex'); // fallback: valid dalam satu proses
    this.requireToken =
      String(this.config.get('LIVENESS_REQUIRE_TOKEN', 'true')).toLowerCase() !== 'false';
    this.challengeTtlMs = Number(this.config.get('LIVENESS_CHALLENGE_TTL_MS', 60_000));
    this.tokenTtlMs = Number(this.config.get('LIVENESS_TOKEN_TTL_MS', 120_000));
    this.minEventGapMs = Number(this.config.get('LIVENESS_MIN_EVENT_GAP_MS', 300));
  }

  get isRequired(): boolean {
    return this.requireToken;
  }

  /** Terbitkan challenge dengan urutan gerakan acak (2 gerakan). */
  createChallenge(tenantId: string, employeeId: string) {
    this.gc();
    const actions: LivenessAction[] = (['BLINK', 'TURN_HEAD'] as LivenessAction[])
      .slice()
      .sort(() => Math.random() - 0.5);
    const now = Date.now();
    const id = randomBytes(16).toString('hex');
    this.challenges.set(id, {
      id,
      tenantId,
      employeeId,
      actions,
      issuedAt: now,
      expiresAt: now + this.challengeTtlMs,
      used: false,
    });
    return {
      challengeId: id,
      actions,
      expiresAt: new Date(now + this.challengeTtlMs).toISOString(),
    };
  }

  /**
   * Validasi urutan gerakan + timing, tandai challenge terpakai, terbitkan
   * token HMAC yang berlaku `tokenTtlMs`.
   */
  verifyChallenge(
    tenantId: string,
    employeeId: string,
    challengeId: string,
    events: LivenessEvent[],
  ) {
    this.gc();
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.tenantId !== tenantId || challenge.employeeId !== employeeId) {
      throw new BadRequestException('Liveness challenge tidak dikenal');
    }
    if (challenge.used) {
      throw new BadRequestException('Liveness challenge sudah dipakai');
    }
    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      throw new BadRequestException('Liveness challenge kedaluwarsa — minta challenge baru');
    }
    if (!Array.isArray(events) || events.length !== challenge.actions.length) {
      throw new BadRequestException(
        `Harus menyelesaikan ${challenge.actions.length} gerakan (${challenge.actions.join(', ')})`,
      );
    }

    let prevAt = 0;
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.action !== challenge.actions[i]) {
        throw new BadRequestException(`Gerakan ke-${i + 1} harus ${challenge.actions[i]}`);
      }
      if (typeof ev.at !== 'number' || !Number.isFinite(ev.at)) {
        throw new BadRequestException('Timestamp gerakan tidak valid');
      }
      // Toleransi skew jam klien ±5 detik terhadap jendela challenge.
      if (ev.at < challenge.issuedAt - 5_000 || ev.at > Date.now() + 5_000) {
        throw new BadRequestException('Timestamp gerakan di luar jendela challenge');
      }
      if (i > 0 && ev.at - prevAt < this.minEventGapMs) {
        throw new BadRequestException('Gerakan terlalu cepat — selesaikan gerakan secara alami');
      }
      prevAt = ev.at;
    }

    challenge.used = true;
    const exp = Date.now() + this.tokenTtlMs;
    const payload = `${tenantId}|${employeeId}|${exp}`;
    return {
      token: `${exp}.${this.sign(payload)}`,
      expiresAt: new Date(exp).toISOString(),
      actions: challenge.actions,
    };
  }

  /**
   * Wajibkan token liveness (jika `LIVENESS_REQUIRE_TOKEN` aktif) sebelum
   * verifikasi wajah / clock-in FACE.
   */
  assertToken(tenantId: string, employeeId: string, token?: string): void {
    if (!this.requireToken) return;
    if (!token) {
      throw new ForbiddenException(
        'Liveness challenge wajib — selesaikan gerakan wajah sebelum verifikasi',
      );
    }
    const [expStr, sig] = token.split('.');
    const exp = Number(expStr);
    if (!expStr || !sig || !Number.isFinite(exp)) {
      throw new UnauthorizedException('Liveness token tidak valid');
    }
    if (Date.now() > exp) {
      throw new UnauthorizedException('Liveness token kedaluwarsa — ulangi challenge');
    }
    const expected = this.sign(`${tenantId}|${employeeId}|${exp}`);
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Liveness token tidak valid');
    }
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  private gc(): void {
    const now = Date.now();
    for (const [key, challenge] of this.challenges) {
      if (challenge.expiresAt <= now) this.challenges.delete(key);
    }
  }
}

