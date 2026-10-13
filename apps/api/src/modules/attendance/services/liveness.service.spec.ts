import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LivenessService, LivenessEvent } from './liveness.service';

const TENANT = 't-1';
const EMP = 'e-1';

// Deterministic secret for token assertions.
const mockConfig = {
  get: jest.fn((key: string, fallback?: any) => {
    if (key === 'LIVENESS_SECRET') return 'test-liveness-secret';
    if (key === 'LIVENESS_REQUIRE_TOKEN') return 'true';
    if (key === 'LIVENESS_MIN_EVENT_GAP_MS') return 300;
    return fallback;
  }),
};

describe('LivenessService - challenge flow (anti photo-spoof)', () => {
  let service: LivenessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LivenessService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<LivenessService>(LivenessService);
  });

  afterEach(() => jest.clearAllMocks());

  const eventsFor = (actions: string[], base = Date.now()): LivenessEvent[] =>
    actions.map((action, i) => ({ action: action as LivenessEvent['action'], at: base + i * 1000 }));

  it('menerbitkan challenge berisi 2 gerakan dari {BLINK, TURN_HEAD}', () => {
    const res = service.createChallenge(TENANT, EMP);
    expect(res.challengeId).toBeTruthy();
    expect(res.actions).toHaveLength(2);
    expect([...res.actions].sort()).toEqual(['BLINK', 'TURN_HEAD']);
    expect(new Date(res.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('menukar gerakan yang benar menjadi token yang valid untuk assertToken', () => {
    const ch = service.createChallenge(TENANT, EMP);
    const res = service.verifyChallenge(TENANT, EMP, ch.challengeId, eventsFor(ch.actions));
    expect(res.token).toMatch(/^\d+\.[0-9a-f]+$/);
    expect(() => service.assertToken(TENANT, EMP, res.token)).not.toThrow();
  });

  it('menolak urutan gerakan yang salah', () => {
    const ch = service.createChallenge(TENANT, EMP);
    const events = eventsFor([...ch.actions].reverse());
    expect(() => service.verifyChallenge(TENANT, EMP, ch.challengeId, events)).toThrow(
      BadRequestException,
    );
  });

  it('menolak jumlah gerakan yang tidak lengkap', () => {
    const ch = service.createChallenge(TENANT, EMP);
    expect(() =>
      service.verifyChallenge(TENANT, EMP, ch.challengeId, [eventsFor(ch.actions)[0]]),
    ).toThrow(BadRequestException);
  });

  it('menolak gerakan yang terlalu cepat (replay instan < gap minimum)', () => {
    const ch = service.createChallenge(TENANT, EMP);
    const base = Date.now();
    const fast: LivenessEvent[] = ch.actions.map((action, i) => ({ action, at: base + i * 50 }));
    expect(() => service.verifyChallenge(TENANT, EMP, ch.challengeId, fast)).toThrow(
      BadRequestException,
    );
  });

  it('menolak challenge milik karyawan lain / tidak dikenal', () => {
    const ch = service.createChallenge(TENANT, EMP);
    expect(() =>
      service.verifyChallenge(TENANT, 'e-other', ch.challengeId, eventsFor(ch.actions)),
    ).toThrow(BadRequestException);
    expect(() =>
      service.verifyChallenge(TENANT, EMP, 'no-such-challenge', eventsFor(['BLINK', 'TURN_HEAD'])),
    ).toThrow(BadRequestException);
  });

  it('challenge bersifat sekali pakai', () => {
    const ch = service.createChallenge(TENANT, EMP);
    service.verifyChallenge(TENANT, EMP, ch.challengeId, eventsFor(ch.actions));
    expect(() => service.verifyChallenge(TENANT, EMP, ch.challengeId, eventsFor(ch.actions))).toThrow(
      BadRequestException,
    );
  });

  it('assertToken menolak token tanpa signature / kadaluarsa / salah subjek', () => {
    const ch = service.createChallenge(TENANT, EMP);
    const { token } = service.verifyChallenge(TENANT, EMP, ch.challengeId, eventsFor(ch.actions));

    expect(() => service.assertToken(TENANT, EMP, undefined)).toThrow(ForbiddenException);
    expect(() => service.assertToken(TENANT, EMP, 'garbage')).toThrow(UnauthorizedException);
    expect(() => service.assertToken(TENANT, EMP, `${Date.now() - 1000}.${'a'.repeat(64)}`)).toThrow(
      UnauthorizedException,
    );
    // Token terikat tenant|employee — ganti subjek → signature tidak cocok.
    expect(() => service.assertToken(TENANT, 'e-other', token)).toThrow(UnauthorizedException);
    expect(() => service.assertToken(TENANT, EMP, token)).not.toThrow();
  });

  it('LIVENESS_REQUIRE_TOKEN=false melewati assertToken', async () => {
    const offModule: TestingModule = await Test.createTestingModule({
      providers: [
        LivenessService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: any) =>
              key === 'LIVENESS_REQUIRE_TOKEN' ? 'false' : fallback,
          },
        },
      ],
    }).compile();
    const off = offModule.get<LivenessService>(LivenessService);
    expect(off.isRequired).toBe(false);
    expect(() => off.assertToken(TENANT, EMP, undefined)).not.toThrow();
  });
});

