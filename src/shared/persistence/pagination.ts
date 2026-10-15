/**
 * Offset-based pagination types shared by repositories, queries and HTTP responses.
 */

/** Which page the client asked for (page numbers start at 1). */
export interface PageRequest {
  readonly page: number;
  readonly limit: number;
}

/** One page of results plus the total number of matching items. */
export interface Page<T> {
  readonly items: T[];
  readonly totalItems: number;
}

/** Sort direction accepted by list endpoints. */
export type SortOrder = 'asc' | 'desc';

/** The paginated response body returned by every list endpoint. */
export interface PaginatedResult<T> {
  readonly data: T[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly totalItems: number;
    readonly totalPages: number;
  };
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Number of rows to skip for a page request. */
export function offsetOf(request: PageRequest): number {
  return (request.page - 1) * request.limit;
}

/** Builds the response body for a page, mapping each item to its DTO. */
export function toPaginatedResult<T, TDto>(
  page: Page<T>,
  request: PageRequest,
  mapItem: (item: T) => TDto,
): PaginatedResult<TDto> {
  return {
    data: page.items.map(mapItem),
    pagination: {
      page: request.page,
      limit: request.limit,
      totalItems: page.totalItems,
      totalPages: Math.ceil(page.totalItems / request.limit),
    },
  };
}
