import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { WORKFLOW_DEFINITIONS } from './workflow.definitions';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowEngineService],
    }).compile();
    service = module.get(WorkflowEngineService);
    service.registerMany(WORKFLOW_DEFINITIONS);
  });

  afterEach(() => jest.clearAllMocks());

  it('registers all built-in workflow definitions', () => {
    const keys = WORKFLOW_DEFINITIONS.map((d) => d.key);
    keys.forEach((key) => expect(service.hasDefinition(key)).toBe(true));
    expect(keys.length).toBeGreaterThanOrEqual(10);
  });

  describe('expense workflow', () => {
    it('allows APPROVE from PENDING', () => {
      const result = service.transition('expense', 'PENDING', 'APPROVE');
      expect(result.to).toBe('APPROVED');
      expect(service.canTransition('expense', 'PENDING', 'APPROVE')).toBe(true);
    });

    it('allows PAY only from APPROVED', () => {
      expect(service.transition('expense', 'APPROVED', 'PAY').to).toBe('PAID');
      expect(service.canTransition('expense', 'PENDING', 'PAY')).toBe(false);
    });

    it('lists only legal actions for a state', () => {
      expect(service.getAvailableActions('expense', 'PENDING').sort()).toEqual(
        ['APPROVE', 'CANCEL', 'REJECT'].sort(),
      );
      expect(service.getAvailableActions('expense', 'PAID')).toEqual([]);
    });

    it('throws BadRequestException for an illegal transition', () => {
      expect(() => service.transition('expense', 'APPROVED', 'APPROVE')).toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for an unknown state', () => {
      expect(() => service.transition('expense', 'NOPE', 'APPROVE')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('definition lookup', () => {
    it('throws NotFoundException for an unregistered workflow', () => {
      expect(() => service.getDefinition('does-not-exist')).toThrow(NotFoundException);
    });
  });
});
