import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '@common/prisma/prisma.service';
import { ClockInMethod } from '../dto/clock-in.dto';
import { BiometricType, DeviceClockInDto } from '../dto/biometric.dto';

@Injectable()
export class BiometricService {
  private readonly faceMatchThreshold: number;
  private readonly deviceSecret: string;
  // Replay protection: remember recently seen (deviceId|ts) nonces for a short TTL.
  private readonly usedNonces = new Map<string, number>();
  private readonly nonceTtlMs: number;
  private readonly maxClockSkewMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.faceMatchThreshold = this.config.get<number>('FACE_MATCH_THRESHOLD', 0.85);
    this.deviceSecret = this.config.get<string>('BIOMETRIC_DEVICE_SECRET', '');
    this.nonceTtlMs = this.config.get<number>('BIOMETRIC_NONCE_TTL_MS', 5 * 60 * 1000);
    this.maxClockSkewMs = this.config.get<number>('BIOMETRIC_CLOCK_SKEW_MS', 5 * 60 * 1000);
  }

  private isReplay(deviceId: string, ts: number): boolean {
    const now = Date.now();
    // Drop expired entries opportunistically.
    for (const [key, expiresAt] of this.usedNonces) {
      if (expiresAt <= now) this.usedNonces.delete(key);
    }
    if (Math.abs(now - ts) > this.maxClockSkewMs) return true;
    const key = `${deviceId}|${ts}`;
    if (this.usedNonces.has(key)) return true;
    this.usedNonces.set(key, now + this.nonceTtlMs);
    return false;
  }

  async enroll(
    tenantId: string,
    employeeId: string,
    type: BiometricType,
    reference: string,
    deviceId?: string,
  ) {
    if (type === BiometricType.FACE) {
      this.assertValidEmbedding(reference);
    }

    return this.prisma.biometricCredential.upsert({
      where: { tenantId_employeeId_type: { tenantId, employeeId, type } },
      create: { tenantId, employeeId, type, reference, deviceId, isActive: true },
      update: { reference, deviceId, isActive: true, updatedAt: new Date() },
    });
  }

  async listForEmployee(tenantId: string, employeeId: string) {
    return this.prisma.biometricCredential.findMany({
      where: { tenantId, employeeId },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  private async findCredentialOrThrow(tenantId: string, id: string) {
    const credential = await this.prisma.biometricCredential.findFirst({
      where: { id, tenantId },
    });
    if (!credential) {
      throw new BadRequestException('Biometric credential not found');
    }
    return credential;
  }

  async setActive(tenantId: string, id: string, isActive: boolean) {
    await this.findCredentialOrThrow(tenantId, id);
    return this.prisma.biometricCredential.update({
      where: { id },
      data: { isActive, updatedAt: new Date() },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findCredentialOrThrow(tenantId, id);
    await this.prisma.biometricCredential.delete({ where: { id } });
    return { id, deleted: true };
  }

  // On-prem face verification (1:1 against the enrolled employee).
  async verifyFace(tenantId: string, employeeId: string, probe: number[]): Promise<{ matched: boolean; score: number }> {
    const credential = await this.prisma.biometricCredential.findUnique({
      where: { tenantId_employeeId_type: { tenantId, employeeId, type: BiometricType.FACE } },
    });

    if (!credential || !credential.isActive) {
      throw new BadRequestException('No active face enrollment for this employee');
    }

    const stored = this.parseEmbedding(credential.reference);
    const score = this.cosineSimilarity(probe, stored);

    return { matched: score >= this.faceMatchThreshold, score };
  }

  // Attendance machine push (fingerprint verified locally on the device).
  // Authenticated via HMAC-SHA256 over the signed payload using a shared device secret.
  async deviceClockIn(tenantId: string, deviceId: string, dto: DeviceClockInDto, signature: string) {
    if (!this.deviceSecret) {
      throw new ForbiddenException('Biometric device integration is not configured');
    }

    const payload = `${dto.employeeId}|${dto.deviceId ?? ''}|${dto.ts}`;
    const expected = createHmac('sha256', this.deviceSecret).update(payload).digest('hex');

    if (!signature || !this.constantTimeEqual(signature, expected)) {
      throw new UnauthorizedException('Invalid device signature');
    }

    if (this.isReplay(dto.deviceId ?? deviceId, dto.ts)) {
      throw new UnauthorizedException('Device nonce expired or already used (possible replay)');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId, tenantId },
      select: { id: true },
    });
    if (!employee) {
      throw new BadRequestException('Unknown employee for this tenant');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clockInTime = new Date();

    return this.prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: dto.employeeId, date: today } },
      create: {
        tenantId,
        employeeId: dto.employeeId,
        date: today,
        clockIn: clockInTime,
        clockInMethod: ClockInMethod.FINGERPRINT,
        clockInPhoto: dto.photo,
        status: 'PRESENT' as any,
      },
      update: {
        clockIn: clockInTime,
        clockInMethod: ClockInMethod.FINGERPRINT,
        clockInPhoto: dto.photo,
      },
    });
  }

  private assertValidEmbedding(reference: string) {
    const arr = this.parseEmbedding(reference);
    if (arr.length < 2) {
      throw new BadRequestException('Invalid face embedding');
    }
  }

  private parseEmbedding(reference: string): number[] {
    try {
      const parsed = JSON.parse(reference);
      if (!Array.isArray(parsed) || parsed.some((n) => typeof n !== 'number')) {
        throw new Error('not a number array');
      }
      return parsed as number[];
    } catch {
      throw new BadRequestException('Face reference must be a JSON array of numbers');
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  private constantTimeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
