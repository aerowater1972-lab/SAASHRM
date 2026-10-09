import { Test, TestingModule } from '@nestjs/testing';
import { VendorTaxService } from './vendor-tax.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('VendorTaxService (withholding calc)', () => {
  let service: VendorTaxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendorTaxService, { provide: PrismaService, useValue: {} }],
    }).compile();
    service = module.get(VendorTaxService);
  });

  it('exposes the PMK-141 rate table', () => {
    const table = service.getRateTable();
    expect(table.find((r) => r.code === 'PPH23_JASA')?.rate).toBe(2);
    expect(table.find((r) => r.code === 'PPH23_DIVIDEN')?.rate).toBe(15);
    expect(table.find((r) => r.code === 'PPH26')?.rate).toBe(20);
  });

  it('withholds 2% normally (potong)', () => {
    const r = service.calculate(10_000_000, 2, false);
    expect(r.taxAmount).toBe(200_000);
    expect(r.netAmount).toBe(9_800_000);
  });

  it('gross-up: vendor receives full amount, DPP grossed', () => {
    const r = service.calculate(10_000_000, 2, true);
    expect(r.netAmount).toBe(10_000_000);
    expect(r.taxAmount).toBe(r.dpp - 10_000_000);
    expect(r.taxAmount).toBeGreaterThan(200_000);
  });

  it('withholds 15% for dividends', () => {
    const r = service.calculate(100_000_000, 15, false);
    expect(r.taxAmount).toBe(15_000_000);
    expect(r.netAmount).toBe(85_000_000);
  });
});
