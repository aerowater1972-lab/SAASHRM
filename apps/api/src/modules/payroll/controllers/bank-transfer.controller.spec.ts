import { Test, TestingModule } from '@nestjs/testing';
import { BankTransferController } from './bank-transfer.controller';
import { BankTransferFormatterService } from '../services/bank-transfer-formatter.service';
import { RunService } from '../services/run.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('BankTransferController', () => {
  let controller: BankTransferController;
  const mockFormatter: any = {
    getSupportedBanks: jest.fn().mockReturnValue([]),
    generateTransferFile: jest.fn(),
    validateRecord: jest.fn().mockReturnValue({ valid: true, errors: [] }),
  };
  const mockRunService: any = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankTransferController],
      providers: [
        { provide: BankTransferFormatterService, useValue: mockFormatter },
        { provide: RunService, useValue: mockRunService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(BankTransferController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getSupportedBanks returns list of banks', async () => {
    const result = await controller.getSupportedBanks();
    expect(mockFormatter.getSupportedBanks).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('validateRecords returns validation results', async () => {
    const records = [
      { employeeName: 'Test', bankCode: 'BCA', bankAccountNumber: '123', bankAccountName: 'Test', amount: 1000, reference: 'REF1', description: 'Test' },
    ];
    const result = await controller.validateRecords(records);
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('invalid');
    expect(result).toHaveProperty('details');
  });
});