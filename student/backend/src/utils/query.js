import { z } from 'zod';

export function pagination(query, sortable, defaults = {}) {
  const parsed = z.object({
    page: z.coerce.number().int().min(0).default(0),
    size: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(sortable).default(defaults.sortBy || 'createdAt'),
    sortDirection: z.enum(['ASC', 'DESC']).default(defaults.sortDirection || 'DESC'),
  }).parse(query);
  return { page: parsed.page, size: parsed.size, skip: parsed.page * parsed.size, sort: { [parsed.sortBy]: parsed.sortDirection === 'ASC' ? 1 : -1, _id: 1 } };
}

export function setPageHeaders(res, total, page, size) {
  res.set({ 'X-Total-Count': String(total), 'X-Page-Number': String(page), 'X-Page-Size': String(size) });
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
