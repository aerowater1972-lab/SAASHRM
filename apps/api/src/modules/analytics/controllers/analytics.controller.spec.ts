import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from '../services/analytics.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  const mockService = {
    getHeadcount: jest.fn(),
    getTurnoverRate: jest.fn(),
    getWorkforceCost: jest.fn(),
    exportReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AnalyticsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getWorkforceCost delegates with tenantId and filters', async () => {
    mockService.getWorkforceCost.mockResolvedValue({ total: 1 });
    const filters = { startDate: '2026-01-01' };
    const result = await controller.getWorkforceCost('tenant-x', filters as any);
    expect(mockService.getWorkforceCost).toHaveBeenCalledWith('tenant-x', filters);
    expect(result).toEqual({ total: 1 });
  });

  it('exportReport delegates with tenantId, userId and dto', async () => {
    mockService.exportReport.mockResolvedValue({ filename: 'x.csv' });
    const dto = { report: 'headcount', format: 'csv' };
    const result = await controller.exportReport('tenant-x', 'emp-1', dto as any);
    expect(mockService.exportReport).toHaveBeenCalledWith('tenant-x', 'emp-1', dto);
    expect(result).toEqual({ filename: 'x.csv' });
  });
});
