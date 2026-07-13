export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginateArgs {
  where?: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  cursor?: Record<string, unknown>;
  distinct?: unknown;
}

/**
 * Paginate a Prisma model. When `page` is omitted the full (unpaginated)
 * result is returned so existing callers/tests keep working; when `page` is
 * provided an envelope with total + page metadata is returned.
 */
export async function paginate<T = unknown>(
  model: { findMany: (args: any) => Promise<any[]>; count: (args: any) => Promise<number> },
  args: PaginateArgs,
  page?: number,
  limit?: number,
): Promise<T[] | Paginated<T>> {
  if (!page) {
    return (await model.findMany(args as Record<string, unknown>)) as T[];
  }

  const pageSize = Math.min(limit ?? 20, 200);
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    model.findMany({ ...args, skip, take: pageSize } as Record<string, unknown>),
    model.count({ where: args.where }),
  ]);

  return { data: data as T[], total, page, pageSize };
}
