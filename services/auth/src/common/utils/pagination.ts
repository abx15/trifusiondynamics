export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface ParsedPagination {
  page: number;
  limit: number;
  take: number;
  skip: number;
}

export function parsePagination(
  pageRaw?: string | number,
  limitRaw?: string | number,
): ParsedPagination {
  const page = Math.max(
    DEFAULT_PAGE,
    Number.isFinite(Number(pageRaw)) && Number(pageRaw) > 0
      ? Math.floor(Number(pageRaw))
      : DEFAULT_PAGE,
  );
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Number.isFinite(Number(limitRaw)) && Number(limitRaw) > 0
        ? Math.floor(Number(limitRaw))
        : DEFAULT_LIMIT,
    ),
  );
  return { page, limit, take: limit, skip: (page - 1) * limit };
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data: items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
