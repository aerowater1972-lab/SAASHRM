import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MedicalService } from './medical.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { encrypt, decrypt } from '@common/util/encryption.util';

describe('MedicalService', () => {
  let service: MedicalService;
  let prisma: any;

  const mockPrisma = {
    employee: { findFirst: jest.fn() },
    employeeMedical: { findUnique: jest.fn(), upsert: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MedicalService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(MedicalService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('encrypts then decrypts (roundtrip)', () => {
    const secret = 'Peanut allergy';
    const cipher = encrypt(secret);
    expect(cipher).not.toContain(secret);
    expect(decrypt(cipher)).toBe(secret);
  });

  it('returns decrypted medical data (BR-05 source of truth)', async () => {
    prisma.employee.findFirst.mockResolvedValue({ id: 'emp-1', bloodType: 'O' });
    prisma.employeeMedical.findUnique.mockResolvedValue({
      employeeId: 'emp-1',
      allergies: encrypt('Peanut'),
      notes: encrypt('Asthma'),
    });

    const res = await service.get('default', 'emp-1');
    expect(res).toEqual({ bloodType: 'O', allergies: 'Peanut', notes: 'Asthma' });
  });

  it('throws NotFoundException when employee missing', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);
    await expect(service.get('default', 'nope')).rejects.toThrow(NotFoundException);
  });

  it('upserts encrypted medical data', async () => {
    prisma.employee.findFirst.mockResolvedValue({ id: 'emp-1' });
    prisma.employeeMedical.upsert.mockImplementation((args: any) =>
      Promise.resolve({ employeeId: 'emp-1', ...args.create, ...args.update }),
    );

    const res = await service.upsert('default', 'emp-1', { allergies: 'Peanut', notes: 'Asthma' });
    expect(res.allergies).toBe('Peanut');
    expect(res.notes).toBe('Asthma');

    const call = prisma.employeeMedical.upsert.mock.calls[0][0];
    expect(call.create.allergies).not.toBe('Peanut'); // stored encrypted
    expect(decrypt(call.create.allergies)).toBe('Peanut');
  });
});
