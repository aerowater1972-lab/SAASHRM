import { useMemo, useState } from 'react';

export interface ClientTableOptions<T> {
  pageSize?: number;
  searchFields?: (keyof T)[];
  predicate?: (item: T) => boolean;
}

/**
 * Client-side search + pagination state for a list already fetched via TanStack Query.
 * Keeps the already-loaded array in memory and slices it for the current page.
 */
export function useClientTable<T>(
  items: T[] | undefined,
  options?: ClientTableOptions<T>,
) {
  const pageSize = options?.pageSize ?? 20;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let result = items ?? [];
    if (options?.predicate) result = result.filter(options.predicate);
    const q = search.trim().toLowerCase();
    if (q && options?.searchFields?.length) {
      result = result.filter((it) =>
        options.searchFields!.some((f) => {
          const v = (it as any)[f];
          return v != null && String(v).toLowerCase().includes(q);
        }),
      );
    }
    return result;
  }, [items, search, options?.predicate, options?.searchFields]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages - 1);
  const paged = filtered.slice(current * pageSize, (current + 1) * pageSize);

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  return {
    search,
    onSearch,
    setSearch,
    page: current,
    setPage,
    pageSize,
    filtered,
    paged,
    totalPages,
  };
}
