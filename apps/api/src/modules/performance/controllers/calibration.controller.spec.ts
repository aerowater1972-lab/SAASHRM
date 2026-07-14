import { Test, TestingModule } from '@nestjs/testing';
import { CalibrationController } from './calibration.controller';
import { CalibrationService } from '../services/calibration.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('CalibrationController', () => {
  let controller: CalibrationController;
  const mockService: any = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    finalize: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalibrationController],
      providers: [{ provide: CalibrationService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CalibrationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates to CalibrationService', async () => {
    const dto = { reviewCycleId: 'c1', departmentId: 'd1', facilitatorId: 'f1' };
    mockService.create.mockResolvedValue('created');
    const result = await controller.create('default', 'user-1', dto);
    expect(mockService.create).toHaveBeenCalledWith('default', 'user-1', dto);
    expect(result).toBe('created');
  });

  it('findAll delegates to CalibrationService', async () => {
    mockService.findAll.mockResolvedValue(['list']);
    const result = await controller.findAll('default', 'c1');
    expect(mockService.findAll).toHaveBeenCalledWith('default', 'c1');
    expect(result).toEqual(['list']);
  });

  it('findOne delegates to CalibrationService', async () => {
    mockService.findOne.mockResolvedValue('one');
    const result = await controller.findOne('default', 'id-1');
    expect(mockService.findOne).toHaveBeenCalledWith('default', 'id-1');
    expect(result).toBe('one');
  });

  it('finalize delegates to CalibrationService with dto', async () => {
    const dto = { note: 'approved' };
    mockService.finalize.mockResolvedValue({ finalized: ['ok'] });
    const result = await controller.finalize('default', 'session-1', dto);
    expect(mockService.finalize).toHaveBeenCalledWith('default', 'session-1', dto);
    expect(result).toEqual({ finalized: ['ok'] });
  });
});
