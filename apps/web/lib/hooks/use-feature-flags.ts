import { useQuery } from '@tanstack/react-query';
import { evaluateFeatureFlags } from '@/lib/api/admin';

/**
 * Runtime feature-flag check for gradual rollouts.
 * Fail-closed: unknown/disabled flag resolves to `false`.
 *
 * @example
 * const newPayrollUi = useFeatureFlag('payroll-v2-ui');
 * if (!newPayrollUi) return <LegacyPayroll />;
 */
export function useFeatureFlag(feature: string): boolean {
  const { data } = useQuery({
    queryKey: ['feature-flags', feature],
    queryFn: () => evaluateFeatureFlags([feature]),
    staleTime: 60_000,
    retry: false,
  });
  return data?.[feature] ?? false;
}

/** Batch variant — one request for multiple flags. */
export function useFeatureFlags(features: string[]): Record<string, boolean> {
  const { data } = useQuery({
    queryKey: ['feature-flags', ...features.sort()],
    queryFn: () => evaluateFeatureFlags(features),
    staleTime: 60_000,
    retry: false,
    enabled: features.length > 0,
  });
  return data ?? Object.fromEntries(features.map((f) => [f, false]));
}
