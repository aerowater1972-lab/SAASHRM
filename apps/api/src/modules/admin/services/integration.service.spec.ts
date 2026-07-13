import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { encrypt } from '@common/util/encryption.util';

describe('IntegrationService (BR-05)', () => {
  let service: IntegrationService;
  const mockPrisma: any = {
    integration: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(IntegrationService);
    jest.clearAllMocks();
  });

  it('encrypts credentials at rest and never returns them in full (BR-05)', async () => {
    mockPrisma.integration.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'i-1', tenantId: 'default', name: 'BANK-X', type: 'BANK', ...args.data }),
    );

    const result = await service.create('default', {
      name: 'BANK-X',
      type: 'BANK',
      credentials: 'secret12345678',
    } as any);

    // stored value is the encrypted form, not the plaintext
    const stored = mockPrisma.integration.create.mock.calls[0][0].data.credentials;
    expect(stored).not.toBe('secret12345678');
    // response is masked (only last 4 chars visible)
    expect(result.credentials).toBe('****5678');
  });

  it('returns masked credentials on list (BR-05)', async () => {
    mockPrisma.integration.findMany.mockResolvedValue([
      { id: 'i-1', name: 'BANK-X', credentials: encrypt('secret12345678') },
    ]);
    const result = await service.findAll('default');
    expect(result[0].credentials).toBe('****5678');
  });

  it('re-encrypts credentials on update (BR-05)', async () => {
    mockPrisma.integration.findFirst.mockResolvedValue({ id: 'i-1' });
    mockPrisma.integration.update.mockImplementation((args: any) =>
      Promise.resolve({ id: 'i-1', ...args.data }),
    );

    await service.update('default', 'i-1', { credentials: 'fresh99887766' } as any);

    const stored = mockPrisma.integration.update.mock.calls[0][0].data.credentials;
    expect(stored).not.toBe('fresh99887766');
  });

  it('throws when integration missing', async () => {
    mockPrisma.integration.findFirst.mockResolvedValue(null);
    await expect(service.remove('default', 'nope')).rejects.toThrow(NotFoundException);
  });
});

