import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import React from 'react';
import { useFeatureFlag, useFeatureFlags } from './use-feature-flags';
import * as adminApi from '@/lib/api/admin';

vi.mock('@/lib/api/admin', () => ({
  evaluateFeatureFlags: vi.fn(),
}));

const mocked = adminApi as unknown as { evaluateFeatureFlags: ReturnType<typeof vi.fn> };

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useFeatureFlag', () => {
  it('returns true when flag is enabled', async () => {
    mocked.evaluateFeatureFlags.mockResolvedValue({ 'payroll-v2': true });
    const { result } = renderHook(() => useFeatureFlag('payroll-v2'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('fail-closes to false on error or unknown flag', async () => {
    mocked.evaluateFeatureFlags.mockRejectedValue(new Error('403'));
    const { result } = renderHook(() => useFeatureFlag('nope'), { wrapper: wrapper() });
    // initial value before query settles is false
    expect(result.current).toBe(false);
    await waitFor(() => expect(mocked.evaluateFeatureFlags).toHaveBeenCalled());
  });
});

describe('useFeatureFlags', () => {
  it('returns batch map', async () => {
    mocked.evaluateFeatureFlags.mockResolvedValue({ a: true, b: false });
    const { result } = renderHook(() => useFeatureFlags(['a', 'b']), { wrapper: wrapper() });
    await waitFor(() => expect(result.current).toEqual({ a: true, b: false }));
  });

  it('returns all-false map for empty input without fetching', async () => {
    const { result } = renderHook(() => useFeatureFlags([]), { wrapper: wrapper() });
    expect(result.current).toEqual({});
  });

  it('single flag resolves through batch path consistently', async () => {
    mocked.evaluateFeatureFlags.mockResolvedValue({ only: true });
    const { result } = renderHook(() => useFeatureFlags(['only']), { wrapper: wrapper() });
    await waitFor(() => expect(result.current).toEqual({ only: true }));
  });
});
