import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ServerTableParams {
  page: number;
  limit: number;
  q: string;
}

export interface ServerTableState<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  setPage: (p: number) => void;
  setSearch: (s: string) => void;
}

/**
 * Server-side table: fetches a paginated envelope `{ data, total, page, pageSize }`
 * from the API. Tolerant of plain arrays (falls back to client-side length) so it
 * keeps working against endpoints that have not enabled pagination yet.
 */
export function useServerTable<T>(
  queryKey: unknown[],
  fetcher: (params: ServerTableParams) => Promise<unknown>,
  opts?: { pageSize?: number },
): ServerTableState<T> {
  const pageSize = opts?.pageSize ?? 20;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [...queryKey, page, search, pageSize],
    queryFn: () => fetcher({ page, limit: pageSize, q: search }),
    placeholderData: keepPreviousData,
  });

  const rows = Array.isArray(data)
    ? (data as T[])
    : (((data as { data?: T[] } | undefined)?.data as T[]) ?? []);
  const total = Array.isArray(data)
    ? (data as T[]).length
    : ((data as { total?: number } | undefined)?.total ?? 0);

  return {
    rows,
    total,
    page,
    pageSize,
    search,
    isLoading,
    isFetching,
    error: (error as Error) ?? null,
    setPage,
    setSearch,
  };
}
