import { Test, TestingModule } from '@nestjs/testing';
import { JobHandlerRegistry } from './job-handler-registry.service';
import { JobHandler, Job } from './job-handler.interface';

describe('JobHandlerRegistry', () => {
  let registry: JobHandlerRegistry;

  const mockHandler: JobHandler = {
    queue: 'events',
    name: 'test.event',
    handle: jest.fn(),
  };

  const mockWildcardHandler: JobHandler = {
    queue: 'events',
    name: '*',
    handle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobHandlerRegistry],
    }).compile();

    registry = module.get<JobHandlerRegistry>(JobHandlerRegistry);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a handler', () => {
      registry.register(mockHandler);

      const result = registry.get('events', 'test.event');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockHandler);
    });

    it('should stack multiple handlers for same key', () => {
      registry.register(mockHandler);
      const newHandler = { ...mockHandler, name: 'test.event' };
      registry.register(newHandler);

      const result = registry.get('events', 'test.event');
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockHandler);
      expect(result[1]).toBe(newHandler);
    });
  });

  describe('get', () => {
    it('should return empty array for unregistered handler', () => {
      const result = registry.get('events', 'nonexistent');
      expect(result).toEqual([]);
    });

    it('should return handlers by queue and name', () => {
      registry.register(mockHandler);

      expect(registry.get('events', 'test.event')).toHaveLength(1);
      expect(registry.get('events', 'other')).toEqual([]);
      expect(registry.get('other', 'test.event')).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should return all registered handlers', () => {
      registry.register(mockHandler);
      registry.register(mockWildcardHandler);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });

    it('should filter by queue', () => {
      const otherHandler: JobHandler = {
        queue: 'other',
        name: 'job',
        handle: jest.fn(),
      };
      registry.register(mockHandler);
      registry.register(otherHandler);

      const eventsHandlers = registry.getAll('events');
      expect(eventsHandlers).toHaveLength(1);
      expect(eventsHandlers[0]).toBe(mockHandler);
    });
  });
});
