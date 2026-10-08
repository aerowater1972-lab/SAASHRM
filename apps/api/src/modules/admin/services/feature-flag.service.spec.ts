import { FeatureFlagService } from './feature-flag.service';

describe('FeatureFlagService (runtime evaluation)', () => {
  const prisma: any = {
    featureFlag: { findMany: jest.fn(), findFirst: jest.fn() },
  };
  let service: FeatureFlagService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FeatureFlagService(prisma);
  });

  it('isEnabled returns true for enabled flag', async () => {
    prisma.featureFlag.findFirst.mockResolvedValue({ enabled: true });
    await expect(service.isEnabled('t1', 'x')).resolves.toBe(true);
  });

  it('isEnabled fail-closes (false) for missing flag', async () => {
    prisma.featureFlag.findFirst.mockResolvedValue(null);
    await expect(service.isEnabled('t1', 'x')).resolves.toBe(false);
  });

  it('evaluateMany defaults missing features to false', async () => {
    prisma.featureFlag.findMany.mockResolvedValue([{ feature: 'a', enabled: true }]);
    await expect(service.evaluateMany('t1', ['a', 'b'])).resolves.toEqual({ a: true, b: false });
  });
});
