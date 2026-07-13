import { Test, TestingModule } from '@nestjs/testing';
import { MovementController } from './movement.controller';
import { MovementService } from '../services/movement.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('MovementController', () => {
  let controller: MovementController;
  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovementController],
      providers: [{ provide: MovementService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(MovementController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates to service with tenantId and dto', async () => {
    const dto = { employeeId: 'emp-1', type: 'PROMOTION' };
    mockService.create.mockResolvedValue('created');
    const result = await controller.create('default', dto);
    expect(mockService.create).toHaveBeenCalledWith('default', dto);
    expect(result).toBe('created');
  });

  it('findAll delegates to service', async () => {
    mockService.findAll.mockResolvedValue(['a']);
    const result = await controller.findAll('default');
    expect(mockService.findAll).toHaveBeenCalledWith('default');
    expect(result).toEqual(['a']);
  });

  it('findOne delegates with id', async () => {
    mockService.findOne.mockResolvedValue('one');
    const result = await controller.findOne('default', 'id-1');
    expect(mockService.findOne).toHaveBeenCalledWith('default', 'id-1');
    expect(result).toBe('one');
  });

  it('approve delegates with id', async () => {
    mockService.approve.mockResolvedValue('approved');
    const result = await controller.approve('default', 'id-1');
    expect(mockService.approve).toHaveBeenCalledWith('default', 'id-1');
    expect(result).toBe('approved');
  });

  it('reject delegates with id', async () => {
    mockService.reject.mockResolvedValue('rejected');
    const result = await controller.reject('default', 'id-1');
    expect(mockService.reject).toHaveBeenCalledWith('default', 'id-1');
    expect(result).toBe('rejected');
  });
});
