import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { BiometricService } from './biometric.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('BiometricService - device registry + batch ingest', () => {
  let service: BiometricService;
  const SECRET = 'test-device-secret';

  const mockPrisma: any = {
    biometricDevice: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    biometricCredential: { findFirst: jest.fn() },
    attendanceRecord: { upsert: jest.fn() },
  };
  const mockConfig = { get: jest.fn((key: string, fallback?: any) => {
    if (key === 'BIOMETRIC_DEVICE_SECRET') return SECRET;
    if (key === 'FACE_MATCH_THRESHOLD') return 0.85;
    return fallback;
  }) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<BiometricService>(BiometricService);
  });

  afterEach(() => jest.clearAllMocks());

  const device = (over: any = {}) => ({
    id: 'dev-1', tenantId: 't1', deviceId: 'ZK-001', name: 'Lobby',
    apiKeyHash: 'x', isActive: true, ...over,
  });

  it('registerDevice returns raw key once and stores only hash', async () => {
    mockPrisma.biometricDevice.findUnique.mockResolvedValue(null);
    mockPrisma.biometricDevice.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'dev-1', ...args.data }),
    );
    const res: any = await service.registerDevice('t1', { deviceId: 'ZK-001', name: 'Lobby' });
    expect(res.apiKey).toBeTruthy();
    expect(res.apiKeyHash).not.toContain(res.apiKey);
    expect(mockPrisma.biometricDevice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deviceId: 'ZK-001' }) }),
    );
  });

  it('registerDevice rejects duplicate deviceId', async () => {
    mockPrisma.biometricDevice.findUnique.mockResolvedValue(device());
    await expect(service.registerDevice('t1', { deviceId: 'ZK-001', name: 'X' })).rejects.toThrow('sudah terdaftar');
  });

  const sign = (deviceId: string, logs: any[]) =>
    createHmac('sha256', SECRET).update(`${deviceId}|${JSON.stringify(logs)}`).digest('hex');

  it('ingests batch with PIN mapping, per-item results', async () => {
    const ts = Date.now();
    const logs = [
      { devicePin: '1001', ts, direction: 'in' },
      { devicePin: '9999', ts, direction: 'in' },
    ];
    mockPrisma.biometricDevice.findUnique.mockResolvedValue(device());
    mockPrisma.biometricDevice.update.mockResolvedValue({});
    mockPrisma.biometricCredential.findFirst.mockImplementation((args: any) =>
      Promise.resolve(args.where.reference === '1001' ? { employeeId: 'emp-1' } : null),
    );
    mockPrisma.attendanceRecord.upsert.mockImplementation((args: any) =>
      Promise.resolve({ id: 'att-1', ...args.create }),
    );
    const res: any = await service.ingestDeviceLogs('t1', 'ZK-001', undefined, logs as any, sign('ZK-001', logs));
    expect(res.total).toBe(2);
    expect(res.ok).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.results[0]).toMatchObject({ ok: true, employeeId: 'emp-1' });
    expect(res.results[1].error).toContain('tidak dikenali');
  });

  it('rejects bad batch signature', async () => {
    mockPrisma.biometricDevice.findUnique.mockResolvedValue(device());
    mockPrisma.biometricDevice.update.mockResolvedValue({});
    await expect(
      service.ingestDeviceLogs('t1', 'ZK-001', undefined, [{ devicePin: '1', ts: Date.now(), direction: 'in' }] as any, 'bad'),
    ).rejects.toThrow('signature');
  });

  it('rejects unregistered or revoked devices', async () => {
    mockPrisma.biometricDevice.findUnique.mockResolvedValue(null);
    await expect(
      service.ingestDeviceLogs('t1', 'GHOST', undefined, [], 'x'),
    ).rejects.toThrow();
    mockPrisma.biometricDevice.findUnique.mockResolvedValue(device({ isActive: false }));
    await expect(
      service.ingestDeviceLogs('t1', 'ZK-001', undefined, [{ devicePin: '1', ts: Date.now(), direction: 'in' }] as any, 'x'),
    ).rejects.toThrow('nonaktif');
  });

  it('wrong device apiKey is rejected', async () => {
    mockPrisma.biometricDevice.findUnique.mockResolvedValue(device());
    await expect(
      service.ingestDeviceLogs('t1', 'ZK-001', 'wrong-key', [{ devicePin: '1', ts: Date.now(), direction: 'in' }] as any, 'x'),
    ).rejects.toThrow('API key');
  });

  it('duplicate log in same batch is flagged as replay, not double-posted', async () => {
    const ts = Date.now();
    const logs = [
      { employeeId: 'emp-1', ts, direction: 'in' },
      { employeeId: 'emp-1', ts, direction: 'in' },
    ];
    mockPrisma.biometricDevice.findUnique.mockResolvedValue(device());
    mockPrisma.biometricDevice.update.mockResolvedValue({});
    mockPrisma.attendanceRecord.upsert.mockImplementation((args: any) =>
      Promise.resolve({ id: 'att-1', ...args.create }),
    );
    const res: any = await service.ingestDeviceLogs('t1', 'ZK-001', undefined, logs as any, sign('ZK-001', logs));
    expect(res.ok).toBe(1);
    expect(res.results[1].error).toContain('Duplikat');
    expect(mockPrisma.attendanceRecord.upsert).toHaveBeenCalledTimes(1);
  });
});
