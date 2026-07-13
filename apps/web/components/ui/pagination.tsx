'use client';

import { Button } from '@/components/ui';

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-xs">
      <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
        Prev
      </Button>
      <span className="px-2 py-1 text-gray-500 dark:text-gray-400">
        {page + 1} / {totalPages}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}
